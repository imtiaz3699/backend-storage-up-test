import ReceiptAnalysisCode from '../models/ReceiptAnalysisCode.js';

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

export const createReceiptAnalysisCode = async (req, res) => {
  try {
    const { analysis_code } = req.body || {};

    if (analysis_code) {
      const existing = await ReceiptAnalysisCode.findOne({ analysis_code: analysis_code.toUpperCase() });
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

    const receiptAnalysisCode = await ReceiptAnalysisCode.create(payload);

    res.status(201).json({
      success: true,
      message: 'Receipt analysis code created successfully',
      data: receiptAnalysisCode
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
      message: 'Error creating receipt analysis code',
      error: error.message
    });
  }
};

export const getReceiptAnalysisCodes = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const [total, receiptAnalysisCodes] = await Promise.all([
      ReceiptAnalysisCode.countDocuments(),
      ReceiptAnalysisCode.find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
    ]);

    res.status(200).json({
      success: true,
      count: receiptAnalysisCodes.length,
      pagination: buildPagination(page, limit, total),
      data: receiptAnalysisCodes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching receipt analysis codes',
      error: error.message
    });
  }
};

export const getReceiptAnalysisCodeById = async (req, res) => {
  try {
    const receiptAnalysisCode = await ReceiptAnalysisCode.findById(req.params.id);

    if (!receiptAnalysisCode) {
      return res.status(404).json({
        success: false,
        message: 'Receipt analysis code not found'
      });
    }

    res.status(200).json({
      success: true,
      data: receiptAnalysisCode
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid receipt analysis code ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching receipt analysis code',
      error: error.message
    });
  }
};

export const updateReceiptAnalysisCode = async (req, res) => {
  try {
    const receiptAnalysisCode = await ReceiptAnalysisCode.findById(req.params.id);

    if (!receiptAnalysisCode) {
      return res.status(404).json({
        success: false,
        message: 'Receipt analysis code not found'
      });
    }

    if (
      req.body?.analysis_code &&
      req.body.analysis_code.toUpperCase() !== receiptAnalysisCode.analysis_code
    ) {
      const duplicate = await ReceiptAnalysisCode.findOne({ analysis_code: req.body.analysis_code.toUpperCase() });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Analysis code must be unique'
        });
      }
      receiptAnalysisCode.analysis_code = req.body.analysis_code.toUpperCase();
    }

    const payload = {
      ...req.body,
      analysis_code: receiptAnalysisCode.analysis_code
    };

    if (payload.gl_acct_code) {
      payload.gl_acct_code = payload.gl_acct_code.toUpperCase();
    }

    Object.assign(receiptAnalysisCode, payload);

    await receiptAnalysisCode.save();

    res.status(200).json({
      success: true,
      message: 'Receipt analysis code updated successfully',
      data: receiptAnalysisCode.toObject()
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid receipt analysis code ID'
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
      message: 'Error updating receipt analysis code',
      error: error.message
    });
  }
};

export const deleteReceiptAnalysisCode = async (req, res) => {
  try {
    const receiptAnalysisCode = await ReceiptAnalysisCode.findByIdAndDelete(req.params.id);

    if (!receiptAnalysisCode) {
      return res.status(404).json({
        success: false,
        message: 'Receipt analysis code not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Receipt analysis code deleted successfully',
      data: {}
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid receipt analysis code ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting receipt analysis code',
      error: error.message
    });
  }
};

