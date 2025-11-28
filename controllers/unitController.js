import Unit from "../models/Unit.js";

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

    const [total, units] = await Promise.all([
      Unit.countDocuments(),
      Unit.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
    ]);

    res.status(200).json({
      success: true,
      count: units.length,
      pagination: buildPagination(page, limit, total),
      data: units,
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

    Object.assign(unit, req.body);
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

    // Assign unit to user
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
