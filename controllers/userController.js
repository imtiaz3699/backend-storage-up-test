import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { getFileUrl } from "../middleware/uploadMiddleware.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a new user
export const createUser = async (req, res) => {
  try {
    const { name, email, phoneNumber, password, roles } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      phoneNumber,
      password,
      roles: roles || ["user"],
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
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
    res.status(500).json({
      success: false,
      message: "Error creating user",
      error: error.message,
    });
  }
};

// Get all users with pagination
export const getAllUsers = async (req, res) => {
  const { name } = req.query;
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter = {};
    if (name && name.trim() !== "") {
      // Case-insensitive name search (matches partial names)
      filter.$or = [
        { name: { $regex: name.trim(), $options: "i" } },
        { first_name: { $regex: name.trim(), $options: "i" } },
        { last_name: { $regex: name.trim(), $options: "i" } },
      ];
    }

    // Get total count for pagination metadata (with filter applied)
    const totalUsers = await User.countDocuments(filter);

    // Get paginated users (with filter applied)
    const users = await User.find(filter)
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sort by newest first

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalUsers / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null,
      },
      data: users,
      filter: name ? { name: name.trim() } : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};

// Search customers by name (for dropdown/autocomplete)
export const searchCustomers = async (req, res) => {
  try {
    const { q, limit: limitParam } = req.query;
    
    // Validate search query
    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required. Please provide a name to search.',
      });
    }

    const searchTerm = q.trim();
    const limit = parseInt(limitParam, 10) || 20; // Default 20 results for dropdown
    
    // Build search filter - case-insensitive partial match
    const filter = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { first_name: { $regex: searchTerm, $options: 'i' } },
        { last_name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    };

    // Search users and return minimal data for dropdown
    const customers = await User.find(filter)
      .select('_id name first_name last_name email phoneNumber')
      .limit(limit)
      .sort({ name: 1 }); // Sort alphabetically by name

    res.status(200).json({
      success: true,
      count: customers.length,
      query: searchTerm,
      data: customers.map(customer => ({
        _id: customer._id,
        name: customer.name,
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
        displayName: customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching customers',
      error: error.message
    });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate('rented_units.unit_id');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Fetch transactions related to this user (both move_out and actual move_out)
    let transactions = await Transaction.find({
      $or: [
        { 'move_out_notice_give.customer_id': user._id },
        { 'actual_move_out_notice.customer_id': user._id }
      ]
    }).sort({ createdAt: -1 });

    // If no transactions exist, return sample (non-persisted) data for frontend integration
    if (!transactions || transactions.length === 0) {
      const now = new Date();
      const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      transactions = [
        {
          _id: '64f1f77bcf86cd7994390001',
          status: 'pending',
          move_out_notice_give: {
            date: now.toISOString(),
            balance_owning: 1043,
            other_charges: 'Cleaning fee',
            customer_id: user._id
          },
          actual_move_out_notice: {
            date: inThreeDays.toISOString(),
            reverse_deposit: 500,
            final_amount_owed: 543,
            customer_id: user._id
          },
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          sample: true
        }
      ];
    }

    const userObject = user.toJSON();
    userObject.transactions = transactions || [];

    // Ensure subscriptions is at least an empty array
    if (!Array.isArray(userObject.subscriptions)) {
      userObject.subscriptions = [];
    }

    // If no subscriptions exist, add sample (non-persisted) subscriptions for frontend integration
    if (!userObject.subscriptions || userObject.subscriptions.length === 0) {
      userObject.subscriptions = [
        {
          _id: '64f1f77bcf86cd7994391001',
          type: '6 × 8 - 2.8 DH',
          quantity: 2,
          status: 'active',
          frequency: 'monthly',
          next_invoice_date: '2025-10-01T00:00:00.000Z',
          next_invoice_amount: 33000,
          sample: true
        },
        {
          _id: '64f1f77bcf86cd7994391002',
          type: '6 × 8 - 2.8 DH',
          quantity: 1,
          status: 'cancelled',
          frequency: 'monthly',
          next_invoice_date: null,
          next_invoice_amount: 0,
          sample: true
        }
      ];
    }

    res.status(200).json({
      success: true,
      data: userObject,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const {
      name,
      first_name,
      last_name,
      email,
      phoneNumber,
      address_line_one,
      address_line_two,
      city,
      state_province,
      zip_code,
      password,
      roles,
      secondaryContactName,
      secondaryPhoneNumber,
      secondaryEmail,
      language,
      other,
    } = req.body;
    const updateData = {};

    // Only include fields that are provided
    if (name !== undefined) updateData.name = name;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (address_line_one !== undefined) updateData.address_line_one = address_line_one;
    if (address_line_two !== undefined) updateData.address_line_two = address_line_two;
    if (city !== undefined) updateData.city = city;
    if (state_province !== undefined) updateData.state_province = state_province;
    if (zip_code !== undefined) updateData.zip_code = zip_code;
    if (password !== undefined) updateData.password = password;
    if (roles !== undefined) updateData.roles = roles;
    if (secondaryContactName !== undefined) updateData.secondaryContactName = secondaryContactName;
    if (secondaryPhoneNumber !== undefined) updateData.secondaryPhoneNumber = secondaryPhoneNumber;
    if (secondaryEmail !== undefined) updateData.secondaryEmail = secondaryEmail;
    if (language !== undefined) updateData.language = language;
    if (other !== undefined) updateData.other = other;

    // Handle file uploads for documents
    if (req.files) {
      // Get current user to delete old files if new ones are uploaded
      const currentUser = await User.findById(req.params.id);
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'documents');
      
      if (req.files.id_document && req.files.id_document[0]) {
        // Delete old file if exists
        if (currentUser?.id_document) {
          try {
            const oldFileName = path.basename(currentUser.id_document);
            const oldFilePath = path.join(uploadsDir, oldFileName);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
              console.log(`[update-user] Deleted old id_document: ${oldFileName}`);
            }
          } catch (error) {
            console.error(`[update-user] Error deleting old id_document:`, error.message);
          }
        }
        // Store file URL
        updateData.id_document = getFileUrl(req.files.id_document[0].filename);
        console.log(`[update-user] Uploaded id_document: ${req.files.id_document[0].filename}`);
      }

      if (req.files.contract_copy && req.files.contract_copy[0]) {
        // Delete old file if exists
        if (currentUser?.contract_copy) {
          try {
            const oldFileName = path.basename(currentUser.contract_copy);
            const oldFilePath = path.join(uploadsDir, oldFileName);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
              console.log(`[update-user] Deleted old contract_copy: ${oldFileName}`);
            }
          } catch (error) {
            console.error(`[update-user] Error deleting old contract_copy:`, error.message);
          }
        }
        // Store file URL
        updateData.contract_copy = getFileUrl(req.files.contract_copy[0].filename);
        console.log(`[update-user] Uploaded contract_copy: ${req.files.contract_copy[0].filename}`);
      }

      if (req.files.additional_records && req.files.additional_records[0]) {
        // Delete old file if exists
        if (currentUser?.additional_records) {
          try {
            const oldFileName = path.basename(currentUser.additional_records);
            const oldFilePath = path.join(uploadsDir, oldFileName);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
              console.log(`[update-user] Deleted old additional_records: ${oldFileName}`);
            }
          } catch (error) {
            console.error(`[update-user] Error deleting old additional_records:`, error.message);
          }
        }
        // Store file URL
        updateData.additional_records = getFileUrl(req.files.additional_records[0].filename);
        console.log(`[update-user] Uploaded additional_records: ${req.files.additional_records[0].filename}`);
      }
    }

    // Also allow updating document URLs directly (if frontend uploads separately)
    if (req.body.id_document && typeof req.body.id_document === 'string') {
      updateData.id_document = req.body.id_document;
    }
    if (req.body.contract_copy && typeof req.body.contract_copy === 'string') {
      updateData.contract_copy = req.body.contract_copy;
    }
    if (req.body.additional_records && typeof req.body.additional_records === 'string') {
      updateData.additional_records = req.body.additional_records;
    }
    // Check if email is being updated and if it's already taken
    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.params.id },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email is already taken by another user.",
        });
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: user,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
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
      message: "Error updating user",
      error: error.message,
    });
  }
};

// Update user's rented units
export const updateUserRentedUnits = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if rented_units is provided
    if (!req.body.rented_units) {
      return res.status(400).json({
        success: false,
        message: "rented_units field is required",
      });
    }

    // Validate that rented_units is an array
    if (!Array.isArray(req.body.rented_units)) {
      return res.status(400).json({
        success: false,
        message: "rented_units must be an array",
      });
    }

    // Validate each rented unit object
    const validKeys = ['unit_id', 'billing_cycle', 'deposit_amount', 'start_date', 'end_date'];
    for (let i = 0; i < req.body.rented_units.length; i++) {
      const rentedUnit = req.body.rented_units[i];
      const providedKeys = Object.keys(rentedUnit);
      const invalidKeys = providedKeys.filter(key => !validKeys.includes(key));

      if (invalidKeys.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid keys in rented_units[${i}]: ${invalidKeys.join(', ')}. Only 'unit_id', 'billing_cycle', 'deposit_amount', 'start_date', and 'end_date' are allowed.`
        });
      }

      // Validate required fields
      if (!rentedUnit.unit_id) {
        return res.status(400).json({
          success: false,
          message: `unit_id is required in rented_units[${i}]`
        });
      }

      // Convert dates if provided as strings
      if (rentedUnit.start_date && typeof rentedUnit.start_date === 'string') {
        rentedUnit.start_date = new Date(rentedUnit.start_date);
      }
      if (rentedUnit.end_date && typeof rentedUnit.end_date === 'string') {
        rentedUnit.end_date = new Date(rentedUnit.end_date);
      }

      // Validate deposit_amount is a number
      if (rentedUnit.deposit_amount !== undefined && isNaN(rentedUnit.deposit_amount)) {
        return res.status(400).json({
          success: false,
          message: `deposit_amount must be a number in rented_units[${i}]`
        });
      }
    }

    // Check for any other keys outside rented_units
    const bodyKeys = Object.keys(req.body);
    const otherKeys = bodyKeys.filter(key => key !== 'rented_units');
    if (otherKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Only 'rented_units' field is allowed. Found additional keys: ${otherKeys.join(', ')}`
      });
    }

    // Get existing rented units
    const existingRentedUnits = user.rented_units || [];

    // Process new units: add new ones or update existing ones with same unit_id
    for (const newUnit of req.body.rented_units) {
      // Convert dates if provided as strings
      const processedUnit = { ...newUnit };
      if (processedUnit.start_date && typeof processedUnit.start_date === 'string') {
        processedUnit.start_date = new Date(processedUnit.start_date);
      }
      if (processedUnit.end_date && typeof processedUnit.end_date === 'string') {
        processedUnit.end_date = processedUnit.end_date ? new Date(processedUnit.end_date) : null;
      }

      // Check if unit with this unit_id already exists
      const existingUnitIndex = existingRentedUnits.findIndex(
        unit => unit.unit_id && unit.unit_id.toString() === processedUnit.unit_id.toString()
      );

      if (existingUnitIndex !== -1) {
        // Update existing unit
        existingRentedUnits[existingUnitIndex] = {
          ...existingRentedUnits[existingUnitIndex].toObject(),
          ...processedUnit
        };
      } else {
        // Add new unit
        existingRentedUnits.push(processedUnit);
      }
    }

    // Update the user's rented_units with merged array
    user.rented_units = existingRentedUnits;
    await user.save();

    // Populate unit details for response
    await user.populate('rented_units.unit_id');

    res.status(200).json({
      success: true,
      message: "User rented units updated successfully",
      data: user,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or unit ID",
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
      message: "Error updating user rented units",
      error: error.message,
    });
  }
};

// Update a specific rented unit for a user
export const updateUserRentedUnit = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get old_unit_id from URL parameter
    const oldUnitId = req.params.unitId;

    // Validate request body structure
    const validKeys = ['unit_id', 'billing_cycle', 'deposit_amount', 'start_date', 'end_date'];
    const providedKeys = Object.keys(req.body);
    const invalidKeys = providedKeys.filter(key => !validKeys.includes(key));

    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid keys: ${invalidKeys.join(', ')}. Only 'unit_id', 'billing_cycle', 'deposit_amount', 'start_date', and 'end_date' are allowed.`
      });
    }

    // Validate required fields
    if (!req.body.unit_id) {
      return res.status(400).json({
        success: false,
        message: "unit_id is required"
      });
    }

    // Convert dates if provided as strings
    const updateData = { ...req.body };
    if (updateData.start_date && typeof updateData.start_date === 'string') {
      updateData.start_date = new Date(updateData.start_date);
    }
    if (updateData.end_date && typeof updateData.end_date === 'string') {
      updateData.end_date = updateData.end_date ? new Date(updateData.end_date) : null;
    }

    // Validate deposit_amount is a number
    if (updateData.deposit_amount !== undefined && isNaN(updateData.deposit_amount)) {
      return res.status(400).json({
        success: false,
        message: "deposit_amount must be a number"
      });
    }

    // Find the unit to update in rented_units array
    const unitIndex = user.rented_units.findIndex(
      unit => unit.unit_id && unit.unit_id.toString() === oldUnitId
    );

    if (unitIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Rented unit with unit_id ${oldUnitId} not found for this user`,
      });
    }

    // Update the specific unit (merge with existing data)
    user.rented_units[unitIndex] = {
      ...user.rented_units[unitIndex].toObject(),
      ...updateData
    };

    await user.save();

    // Populate unit details for response
    await user.populate('rented_units.unit_id');

    res.status(200).json({
      success: true,
      message: "User rented unit updated successfully",
      data: user,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or unit ID",
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
      message: "Error updating user rented unit",
      error: error.message,
    });
  }
};

// Remove a specific rented unit from user
export const removeUserRentedUnit = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get unit_id from URL parameter
    const unitIdToRemove = req.params.unitId;

    // Find the unit index in rented_units array
    const unitIndex = user.rented_units.findIndex(
      unit => unit.unit_id && unit.unit_id.toString() === unitIdToRemove
    );

    if (unitIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Rented unit with unit_id ${unitIdToRemove} not found for this user`,
      });
    }

    // Remove the unit from the array
    user.rented_units.splice(unitIndex, 1);
    await user.save();

    // Populate remaining unit details for response
    await user.populate('rented_units.unit_id');

    res.status(200).json({
      success: true,
      message: "Rented unit removed successfully",
      data: user,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or unit ID",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error removing rented unit",
      error: error.message,
    });
  }
};

// Update user's charges
export const updateUserCharges = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if charges is provided
    if (!req.body.charges) {
      return res.status(400).json({
        success: false,
        message: "charges field is required",
      });
    }

    // Validate that charges is an object
    if (typeof req.body.charges !== 'object' || Array.isArray(req.body.charges)) {
      return res.status(400).json({
        success: false,
        message: "charges must be an object",
      });
    }

    // Validate charge object keys
    const validKeys = ['date', 'analysis_code', 'quantity', 'description', 'charge_amount', 'invoice_narration', 'from', 'to', 'print_this_info_on_invoice'];
    const providedKeys = Object.keys(req.body.charges);
    const invalidKeys = providedKeys.filter(key => !validKeys.includes(key));

    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid keys in charges: ${invalidKeys.join(', ')}. Only 'date', 'analysis_code', 'quantity', 'description', 'charge_amount', 'invoice_narration', 'from', 'to', and 'print_this_info_on_invoice' are allowed.`
      });
    }

    // Process charge object
    const processedCharge = { ...req.body.charges };
    
    // Convert dates if provided as strings
    if (processedCharge.date && typeof processedCharge.date === 'string') {
      processedCharge.date = new Date(processedCharge.date);
    } else if (processedCharge.date === null || processedCharge.date === '') {
      processedCharge.date = null;
    }
    
    if (processedCharge.from && typeof processedCharge.from === 'string') {
      processedCharge.from = new Date(processedCharge.from);
    } else if (processedCharge.from === null || processedCharge.from === '') {
      processedCharge.from = null;
    }
    
    if (processedCharge.to && typeof processedCharge.to === 'string') {
      processedCharge.to = new Date(processedCharge.to);
    } else if (processedCharge.to === null || processedCharge.to === '') {
      processedCharge.to = null;
    }

    // Validate numeric fields
    if (processedCharge.quantity !== undefined && isNaN(processedCharge.quantity)) {
      return res.status(400).json({
        success: false,
        message: "quantity must be a number"
      });
    }
    if (processedCharge.charge_amount !== undefined && isNaN(processedCharge.charge_amount)) {
      return res.status(400).json({
        success: false,
        message: "charge_amount must be a number"
      });
    }

    // Validate boolean field
    if (processedCharge.print_this_info_on_invoice !== undefined && typeof processedCharge.print_this_info_on_invoice !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "print_this_info_on_invoice must be a boolean"
      });
    }

    // Check for any other keys outside charges
    const bodyKeys = Object.keys(req.body);
    const otherKeys = bodyKeys.filter(key => key !== 'charges');
    if (otherKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Only 'charges' field is allowed. Found additional keys: ${otherKeys.join(', ')}`
      });
    }

    // Update the user's charges with the new object
    user.charges = processedCharge;
    await user.save();

    // Populate analysis_code for response
    await user.populate('charges.analysis_code');

    res.status(200).json({
      success: true,
      message: "User charges updated successfully",
      data: user,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or analysis code ID",
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
      message: "Error updating user charges",
      error: error.message,
    });
  }
};

// Undo (clear) user's charges
export const undoUserCharges = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if charges exist
    if (!user.charges || user.charges === null) {
      return res.status(400).json({
        success: false,
        message: "No charges to undo. Charges field is already empty.",
      });
    }

    // Clear the charges by setting to null
    user.charges = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "User charges undone successfully (charges cleared)",
      data: user,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error undoing user charges",
      error: error.message,
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: {},
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error.message,
    });
  }
};
