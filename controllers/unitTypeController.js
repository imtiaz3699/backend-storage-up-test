import UnitType from '../models/UnitType.js';

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
    prevPage: hasPrevPage ? page - 1 : null
  };
};

export const createUnitType = async (req, res) => {
  try {
    const { type_code } = req.body || {};

    if (type_code) {
      const existing = await UnitType.findOne({ type_code: type_code.toUpperCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Type code must be unique'
        });
      }
    }

    const unitType = await UnitType.create({
      ...req.body,
      type_code: req.body.type_code?.toUpperCase()
    });

    res.status(201).json({
      success: true,
      message: 'Unit type created successfully',
      data: unitType
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Type code must be unique'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating unit type',
      error: error.message
    });
  }
};

export const getUnitTypes = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const [total, unitTypes] = await Promise.all([
      UnitType.countDocuments(),
      UnitType.find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
    ]);

    res.status(200).json({
      success: true,
      count: unitTypes.length,
      pagination: buildPagination(page, limit, total),
      data: unitTypes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching unit types',
      error: error.message
    });
  }
};

export const getUnitTypeById = async (req, res) => {
  try {
    const unitType = await UnitType.findById(req.params.id);

    if (!unitType) {
      return res.status(404).json({
        success: false,
        message: 'Unit type not found'
      });
    }

    res.status(200).json({
      success: true,
      data: unitType
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid unit type ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching unit type',
      error: error.message
    });
  }
};

export const updateUnitType = async (req, res) => {
  try {
    const unitType = await UnitType.findById(req.params.id);

    if (!unitType) {
      return res.status(404).json({
        success: false,
        message: 'Unit type not found'
      });
    }

    if (req.body?.type_code && req.body.type_code.toUpperCase() !== unitType.type_code) {
      const duplicate = await UnitType.findOne({ type_code: req.body.type_code.toUpperCase() });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Type code must be unique'
        });
      }
      unitType.type_code = req.body.type_code.toUpperCase();
    }

    Object.assign(unitType, { ...req.body, type_code: unitType.type_code });
    await unitType.save();

    res.status(200).json({
      success: true,
      message: 'Unit type updated successfully',
      data: unitType.toObject()
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid unit type ID'
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

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Type code must be unique'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating unit type',
      error: error.message
    });
  }
};

export const deleteUnitType = async (req, res) => {
  try {
    const unitType = await UnitType.findByIdAndDelete(req.params.id);

    if (!unitType) {
      return res.status(404).json({
        success: false,
        message: 'Unit type not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Unit type deleted successfully',
      data: {}
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid unit type ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting unit type',
      error: error.message
    });
  }
};



