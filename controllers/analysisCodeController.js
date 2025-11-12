import AnalysisCode from '../models/AnalysisCode.js';

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

export const createAnalysisCode = async (req, res) => {
  try {
    const { analysis_code } = req.body || {};

    if (analysis_code) {
      const existing = await AnalysisCode.findOne({ analysis_code: analysis_code.toUpperCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Analysis code must be unique'
        });
      }
    }

    const payload = {
      ...req.body,
      analysis_code: req.body.analysis_code?.toUpperCase()
    };

    if (payload.gl_acct_code) {
      payload.gl_acct_code = payload.gl_acct_code.toUpperCase();
    }

    const analysisCode = await AnalysisCode.create(payload);

    res.status(201).json({
      success: true,
      message: 'Analysis code created successfully',
      data: analysisCode
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
        message: 'Analysis code must be unique'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating analysis code',
      error: error.message
    });
  }
};

export const getAnalysisCodes = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const [total, analysisCodes] = await Promise.all([
      AnalysisCode.countDocuments(),
      AnalysisCode.find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
    ]);

    res.status(200).json({
      success: true,
      count: analysisCodes.length,
      pagination: buildPagination(page, limit, total),
      data: analysisCodes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching analysis codes',
      error: error.message
    });
  }
};

export const getAnalysisCodeById = async (req, res) => {
  try {
    const analysisCode = await AnalysisCode.findById(req.params.id);

    if (!analysisCode) {
      return res.status(404).json({
        success: false,
        message: 'Analysis code not found'
      });
    }

    res.status(200).json({
      success: true,
      data: analysisCode
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid analysis code ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching analysis code',
      error: error.message
    });
  }
};

export const updateAnalysisCode = async (req, res) => {
  try {
    const analysisCode = await AnalysisCode.findById(req.params.id);

    if (!analysisCode) {
      return res.status(404).json({
        success: false,
        message: 'Analysis code not found'
      });
    }

    if (
      req.body?.analysis_code &&
      req.body.analysis_code.toUpperCase() !== analysisCode.analysis_code
    ) {
      const duplicate = await AnalysisCode.findOne({ analysis_code: req.body.analysis_code.toUpperCase() });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Analysis code must be unique'
        });
      }
      analysisCode.analysis_code = req.body.analysis_code.toUpperCase();
    }

    const payload = {
      ...req.body,
      analysis_code: analysisCode.analysis_code
    };

    if (payload.gl_acct_code) {
      payload.gl_acct_code = payload.gl_acct_code.toUpperCase();
    }

    Object.assign(analysisCode, payload);

    await analysisCode.save();

    res.status(200).json({
      success: true,
      message: 'Analysis code updated successfully',
      data: analysisCode.toObject()
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid analysis code ID'
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
        message: 'Analysis code must be unique'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating analysis code',
      error: error.message
    });
  }
};

export const deleteAnalysisCode = async (req, res) => {
  try {
    const analysisCode = await AnalysisCode.findByIdAndDelete(req.params.id);

    if (!analysisCode) {
      return res.status(404).json({
        success: false,
        message: 'Analysis code not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Analysis code deleted successfully',
      data: {}
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid analysis code ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting analysis code',
      error: error.message
    });
  }
};
