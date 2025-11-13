import NoticeSetup from '../models/NoticeSetup.js';

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

export const createNoticeSetup = async (req, res) => {
  try {
    const noticeSetup = await NoticeSetup.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Notice setup created successfully',
      data: noticeSetup
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

    res.status(500).json({
      success: false,
      message: 'Error creating notice setup',
      error: error.message
    });
  }
};

export const getNoticeSetups = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const [total, noticeSetups] = await Promise.all([
      NoticeSetup.countDocuments(),
      NoticeSetup.find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
    ]);

    res.status(200).json({
      success: true,
      count: noticeSetups.length,
      pagination: buildPagination(page, limit, total),
      data: noticeSetups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching notice setups',
      error: error.message
    });
  }
};

export const getNoticeSetupById = async (req, res) => {
  try {
    const noticeSetup = await NoticeSetup.findById(req.params.id);

    if (!noticeSetup) {
      return res.status(404).json({
        success: false,
        message: 'Notice setup not found'
      });
    }

    res.status(200).json({
      success: true,
      data: noticeSetup
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid notice setup ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching notice setup',
      error: error.message
    });
  }
};

export const updateNoticeSetup = async (req, res) => {
  try {
    const noticeSetup = await NoticeSetup.findById(req.params.id);

    if (!noticeSetup) {
      return res.status(404).json({
        success: false,
        message: 'Notice setup not found'
      });
    }

    Object.assign(noticeSetup, req.body);
    await noticeSetup.save();

    res.status(200).json({
      success: true,
      message: 'Notice setup updated successfully',
      data: noticeSetup.toObject()
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid notice setup ID'
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
      message: 'Error updating notice setup',
      error: error.message
    });
  }
};

export const deleteNoticeSetup = async (req, res) => {
  try {
    const noticeSetup = await NoticeSetup.findByIdAndDelete(req.params.id);

    if (!noticeSetup) {
      return res.status(404).json({
        success: false,
        message: 'Notice setup not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notice setup deleted successfully',
      data: {}
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid notice setup ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting notice setup',
      error: error.message
    });
  }
};

