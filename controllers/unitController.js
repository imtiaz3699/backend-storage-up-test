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
