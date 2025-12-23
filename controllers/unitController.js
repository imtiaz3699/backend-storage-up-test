import Unit from "../models/Unit.js";
import User from "../models/User.js";

const buildPagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit) || 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    limit,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null,
  };
};

export const createUnit = async (req, res) => {
  try {
    const { unit_number } = req.body || {};

    if (unit_number) {
      const existing = await Unit.findOne({ unit_number });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Unit number must be unique",
        });
      }
    }

    const unit = await Unit.create(req.body);
    res.status(201).json({
      success: true,
      message: "Unit created successfully",
      data: unit,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Unit number must be unique",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating unit",
      error: error.message,
    });
  }
};

export const getUnits = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    // Filter by unit_number if provided and not empty
    if (req.query.unit_number && req.query.unit_number.trim() !== '') {
      filter.unit_number = { $regex: req.query.unit_number.trim(), $options: 'i' };
    }

    // Filter by customer_name if provided and not empty
    // This requires finding users by name first, then filtering units by their emails
    let customerEmailFilter = null;
    if (req.query.customer_name && req.query.customer_name.trim() !== '') {
      const customerNameSearch = req.query.customer_name.trim();
      const customerNameRegex = { $regex: customerNameSearch, $options: 'i' };
      const customers = await User.find({ 
        name: customerNameRegex 
      }).select('email');
      
      if (customers.length > 0) {
        const customerEmails = customers.map(c => c.email.toLowerCase());
        customerEmailFilter = { $in: customerEmails };
      } else {
        // If no customers found with this name, return empty result
        customerEmailFilter = { $in: [] }; // Empty array means no matches
      }
    }

    // Filter by status (unit_is) if provided and not empty
    if (req.query.status && req.query.status.trim() !== '') {
      filter.unit_is = req.query.status.trim().toLowerCase();
    }

    // Build sort object
    let sort = { createdAt: -1 }; // Default sort by date (newest first)
    
    if (req.query.sort_by) {
      const sortBy = req.query.sort_by.toLowerCase();
      const sortOrder = req.query.sort_order === 'asc' ? 1 : -1; // Default descending
      
      if (sortBy === 'date' || sortBy === 'createdat') {
        sort = { createdAt: sortOrder };
      } else if (sortBy === 'status' || sortBy === 'unit_status') {
        sort = { 'unit_details.unit_status': sortOrder };
      }
    }

    // If customer_name filter is provided, add customer_email filter
    if (customerEmailFilter) {
      filter.customer_email = customerEmailFilter;
    }

    // First, fix any status inconsistencies in the database before fetching
    // If any units have customer_email but status is not 'rented', update them
    const updateResult = await Unit.updateMany(
      { 
        customer_email: { $exists: true, $ne: null, $ne: '' },
        unit_is: { $ne: 'rented' }
      },
      { 
        $set: { unit_is: 'rented' }
      }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log(`[getUnits] Auto-updated ${updateResult.modifiedCount} unit(s) status to 'rented' (had customer_email but wrong status)`);
    }

    const [total, units] = await Promise.all([
      Unit.countDocuments(filter),
      Unit.find(filter).skip(skip).limit(limit).sort(sort),
    ]);

    // For rented units, fetch customer information
    // Note: After the bulk update above, all units with customer_email should have status 'rented'
    const unitsWithCustomerInfo = await Promise.all(
      units.map(async (unit) => {
        // Reload unit to get latest status after bulk update (if needed)
        const unitObj = unit.toObject();
        
        // Final check: ensure unit with customer_email has status 'rented' (should already be fixed by bulk update)
        if (unit.customer_email && unit.customer_email.trim() !== '' && unit.unit_is !== 'rented') {
          // This shouldn't happen after bulk update, but handle it just in case
          unit.unit_is = 'rented';
          await unit.save();
          unitObj.unit_is = 'rented';
          console.log(`[getUnits] Per-unit fix: Updated unit ${unit._id} (${unit.unit_number}) status to 'rented' (has customer_email: ${unit.customer_email})`);
        }
        
        // Use unitObj.unit_is for consistency (it reflects any updates we made)
        const unitStatus = unitObj.unit_is || unit.unit_is;
        
        // If unit is rented and has customer_email, fetch customer details
        if (unitStatus === 'rented' && unit.customer_email) {
          try {
            const customer = await User.findOne({ 
              email: unit.customer_email.toLowerCase() 
            }).select('_id name email phoneNumber roles createdAt');
            
            if (customer) {
              unitObj.customer_info = {
                _id: customer._id,
                name: customer.name,
                email: customer.email,
                phoneNumber: customer.phoneNumber,
                roles: customer.roles,
                createdAt: customer.createdAt
              };
            } else {
              // Customer email exists but user not found in database
              unitObj.customer_info = null;
            }
          } catch (error) {
            console.error(`Error fetching customer info for unit ${unit._id}:`, error);
            unitObj.customer_info = null;
          }
        } else {
          // Unit is vacant or has no customer_email
          unitObj.customer_info = null;
        }
        
        return unitObj;
      })
    );

    res.status(200).json({
      success: true,
      count: unitsWithCustomerInfo.length,
      pagination: buildPagination(page, limit, total),
      data: unitsWithCustomerInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching units",
      error: error.message,
    });
  }
};

// Search units by unit number (for dropdown/autocomplete)
export const searchUnits = async (req, res) => {
  try {
    const { q, limit: limitParam } = req.query;
    
    // Validate search query
    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required. Please provide a unit number to search.',
      });
    }

    const searchTerm = q.trim();
    const limit = parseInt(limitParam, 10) || 20; // Default 20 results for dropdown
    
    // Build search filter - case-insensitive partial match on unit_number
    const filter = {
      unit_number: { $regex: searchTerm, $options: 'i' }
    };

    // Search units and return minimal data for dropdown
    const units = await Unit.find(filter)
      .select('_id unit_number location unit_is monthly_rate customer_email')
      .limit(limit)
      .sort({ unit_number: 1 }); // Sort alphabetically by unit number

    res.status(200).json({
      success: true,
      count: units.length,
      query: searchTerm,
      data: units.map(unit => ({
        _id: unit._id,
        unit_number: unit.unit_number,
        location: unit.location,
        unit_is: unit.unit_is,
        monthly_rate: unit.monthly_rate,
        customer_email: unit.customer_email,
        displayText: `${unit.unit_number}${unit.location ? ` - ${unit.location}` : ''}${unit.unit_is === 'rented' ? ' (Rented)' : ' (Vacant)'}`
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching units',
      error: error.message
    });
  }
};

export const getUnitById = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    res.status(200).json({
      success: true,
      data: unit,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid unit ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error fetching unit",
      error: error.message,
    });
  }
};

export const updateUnit = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    if (req.body?.unit_number && req.body.unit_number !== unit.unit_number) {
      const duplicate = await Unit.findOne({
        unit_number: req.body.unit_number,
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Unit number must be unique",
        });
      }
    }

    // Check if customer_email is being set in the update
    const hasCustomerEmailInUpdate = req.body.customer_email && req.body.customer_email.trim() !== '';
    
    Object.assign(unit, req.body);
    
    // Auto-update status: if unit has customer_email (either from update or existing), status should be 'rented'
    // This ensures consistency when customer_email is assigned
    if (unit.customer_email && unit.customer_email.trim() !== '' && unit.unit_is !== 'rented') {
      unit.unit_is = 'rented';
      console.log(`[updateUnit] Auto-updated unit ${unit._id} status to 'rented' (has customer_email: ${unit.customer_email})`);
    }
    
    await unit.save();

    res.status(200).json({
      success: true,
      message: "Unit updated successfully",
      data: unit.toObject(),
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid unit ID",
      });
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Unit number must be unique",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating unit",
      error: error.message,
    });
  }
};

// Update only the status (unit_is) of a unit
export const updateUnitStatus = async (req, res) => {
  try {
    const { status, customer_email } = req.body;

    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        message: "status is required and must be a string",
      });
    }

    const normalizedStatus = status.trim().toLowerCase();
    const allowedStatuses = ['available', 'vacant', 'rented', 'reserved', 'repair', 'to_clean', 'locked', 'on_site', 'unavailable'];
    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${allowedStatuses.join(', ')}`,
      });
    }

    const unit = await Unit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    // If setting to vacant/available/unavailable/to_clean/repair/locked/on_site/reserved/rented
    // - Clear customer_email when status is clearly not occupied (vacant/available/unavailable/to_clean/repair)
    // - Otherwise keep or update if provided
    const clearEmailStatuses = ['vacant', 'available', 'unavailable', 'to_clean', 'repair'];
    if (clearEmailStatuses.includes(normalizedStatus)) {
      unit.customer_email = null;
    } else if (customer_email && typeof customer_email === 'string' && customer_email.trim() !== '') {
      unit.customer_email = customer_email.toLowerCase().trim();
    }

    // Update the status
    unit.unit_is = normalizedStatus;
    await unit.save();

    res.status(200).json({
      success: true,
      message: "Unit status updated successfully",
      data: unit,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid unit ID",
      });
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating unit status",
      error: error.message,
    });
  }
};

export const deleteUnit = async (req, res) => {
  try {
    const unit = await Unit.findByIdAndDelete(req.params.id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Unit deleted successfully",
      data: {},
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid unit ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error deleting unit",
      error: error.message,
    });
  }
};

// Assign/Rent a unit to a user
export const assignUnitToUser = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { customer_email } = req.body;

    if (!customer_email) {
      return res.status(400).json({
        success: false,
        message: 'Customer email is required'
      });
    }

    const unit = await Unit.findById(unitId);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    // Check if unit is already rented to someone else
    if (unit.unit_is === 'rented' && unit.customer_email && unit.customer_email.toLowerCase() !== customer_email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: `Unit is already rented to another customer (${unit.customer_email})`
      });
    }

    // Assign unit to user - automatically set status to 'rented'
    unit.customer_email = customer_email.toLowerCase().trim();
    unit.unit_is = 'rented';
    
    await unit.save();

    res.status(200).json({
      success: true,
      message: 'Unit assigned to user successfully',
      data: unit
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid unit ID'
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error assigning unit to user',
      error: error.message
    });
  }
};

// Release/Vacate a unit (remove user assignment)
export const releaseUnit = async (req, res) => {
  try {
    const { unitId } = req.params;

    const unit = await Unit.findById(unitId);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    // Release unit
    unit.customer_email = null;
    unit.unit_is = 'vacant';
    
    await unit.save();

    res.status(200).json({
      success: true,
      message: 'Unit released successfully',
      data: unit
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid unit ID'
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error releasing unit',
      error: error.message
    });
  }
};

// Helper function to parse number input (handles ranges and individual numbers)
const parseNumberInput = (input) => {
  if (!input || typeof input !== 'string') {
    return [];
  }

  const numbers = [];
  // Split by comma or newline, then trim each part
  const parts = input.split(/[,\n]/).map(part => part.trim()).filter(part => part);

  for (const part of parts) {
    // Check if it's a range (e.g., "99-102")
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
      
      if (isNaN(start) || isNaN(end)) {
        continue; // Skip invalid ranges
      }

      // Generate range (inclusive)
      const min = Math.min(start, end);
      const max = Math.max(start, end);
      
      for (let i = min; i <= max; i++) {
        numbers.push(i);
      }
    } else {
      // It's an individual number
      const num = parseInt(part, 10);
      if (!isNaN(num)) {
        numbers.push(num);
      }
    }
  }

  // Remove duplicates and sort
  return [...new Set(numbers)].sort((a, b) => a - b);
};

// Helper function to extract prefix from unit number (non-numeric part)
const extractPrefix = (unitNumber) => {
  if (!unitNumber || typeof unitNumber !== 'string') {
    return '';
  }
  
  // Extract all non-numeric characters from the beginning
  const match = unitNumber.match(/^([^0-9]*)/);
  return match ? match[1] : '';
};

// Helper function to apply force length padding
const applyForceLength = (numbers, forceLength) => {
  if (!forceLength || forceLength <= 0) {
    return numbers.map(num => String(num));
  }

  return numbers.map(num => {
    const numStr = String(num);
    return numStr.padStart(forceLength, '0');
  });
};

// Multiply/Create multiple units from a source unit
export const multiplyUnits = async (req, res) => {
  try {
    const { sourceUnitNumber, forceLength, newNumbers } = req.body;

    // Validate required fields
    if (!sourceUnitNumber || typeof sourceUnitNumber !== 'string' || sourceUnitNumber.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Source unit number is required'
      });
    }

    if (!newNumbers || typeof newNumbers !== 'string' || newNumbers.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'New numbers are required. Please provide unit numbers separated by commas or new lines.'
      });
    }

    // Fetch source unit by unit_number
    const sourceUnit = await Unit.findOne({ unit_number: sourceUnitNumber.trim() });
    if (!sourceUnit) {
      return res.status(404).json({
        success: false,
        message: `Source unit with number "${sourceUnitNumber}" not found`
      });
    }

    // Extract prefix from source unit number (e.g., "A" from "A001")
    const sourceUnitPrefix = extractPrefix(sourceUnitNumber.trim());

    // Parse and expand numbers
    const numberList = parseNumberInput(newNumbers);
    
    if (numberList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid numbers found in the input'
      });
    }

    // Apply force length padding
    const paddedNumbers = applyForceLength(numberList, forceLength);

    // Prepend prefix to each unit number (e.g., "A" + "0176" = "A0176")
    const finalUnitNumbers = paddedNumbers.map(num => sourceUnitPrefix + num);

    // Check for existing units with these numbers
    const existingUnits = await Unit.find({
      unit_number: { $in: finalUnitNumbers }
    });

    const existingNumbers = new Set(existingUnits.map(u => u.unit_number));
    const uniqueNumbers = finalUnitNumbers.filter(num => !existingNumbers.has(num));
    const skippedNumbers = finalUnitNumbers.filter(num => existingNumbers.has(num));

    if (uniqueNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All unit numbers already exist',
        skipped: skippedNumbers
      });
    }

    // Generate unit objects from source unit
    const unitsToCreate = uniqueNumbers.map(unitNumber => {
      // Create a new unit object based on source unit
      const newUnit = {
        unit_number: unitNumber,
        location: sourceUnit.location,
        location_two: sourceUnit.location_two || undefined,
        description: sourceUnit.description || undefined,
        unit_details: sourceUnit.unit_details ? { ...sourceUnit.unit_details.toObject() } : undefined,
        dimensions: sourceUnit.dimensions ? { ...sourceUnit.dimensions.toObject() } : undefined,
        monthly_rate: sourceUnit.monthly_rate || 0,
        other_information: sourceUnit.other_information ? { ...sourceUnit.other_information.toObject() } : undefined,
        maintenance_comments: sourceUnit.maintenance_comments || undefined,
        unit_is: 'vacant', // Always default to vacant
        customer_email: null // Always empty for new units
      };

      // Remove undefined fields
      Object.keys(newUnit).forEach(key => {
        if (newUnit[key] === undefined) {
          delete newUnit[key];
        }
      });

      return newUnit;
    });

    // Bulk create units
    const createdUnits = await Unit.insertMany(unitsToCreate, {
      ordered: false // Continue even if some fail
    });

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdUnits.length} unit(s)`,
      created: createdUnits.length,
      skipped: skippedNumbers.length,
      skippedNumbers: skippedNumbers.length > 0 ? skippedNumbers : undefined,
      totalRequested: paddedNumbers.length,
      data: createdUnits
    });
  } catch (error) {
    // Handle bulk write errors (duplicates)
    if (error.name === 'BulkWriteError') {
      const created = error.result?.insertedCount || 0;
      const duplicates = error.writeErrors?.filter(e => e.code === 11000) || [];
      
      return res.status(207).json({ // 207 Multi-Status
        success: true,
        message: `Partially created ${created} unit(s). Some units already exist.`,
        created: created,
        skipped: duplicates.length,
        errors: duplicates.map(e => ({
          unit_number: e.op?.unit_number,
          message: 'Unit number already exists'
        }))
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error multiplying units',
      error: error.message
    });
  }
};
