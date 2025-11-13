import NoticeCharge from '../models/NoticeCharge.js';

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

export const createNoticeCharge = async (req, res) => {
  try {
    const noticeCharge = await NoticeCharge.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Notice charge created successfully',
      data: noticeCharge
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
      message: 'Error creating notice charge',
      error: error.message
    });
  }
};

export const getNoticeCharges = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const [total, noticeCharges] = await Promise.all([
      NoticeCharge.countDocuments(),
      NoticeCharge.find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
    ]);

    res.status(200).json({
      success: true,
      count: noticeCharges.length,
      pagination: buildPagination(page, limit, total),
      data: noticeCharges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching notice charges',
      error: error.message
    });
  }
};

export const getNoticeChargeById = async (req, res) => {
  try {
    const noticeCharge = await NoticeCharge.findById(req.params.id);

    if (!noticeCharge) {
      return res.status(404).json({
        success: false,
        message: 'Notice charge not found'
      });
    }

    res.status(200).json({
      success: true,
      data: noticeCharge
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid notice charge ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching notice charge',
      error: error.message
    });
  }
};

export const updateNoticeCharge = async (req, res) => {
  try {
    const noticeCharge = await NoticeCharge.findById(req.params.id);

    if (!noticeCharge) {
      return res.status(404).json({
        success: false,
        message: 'Notice charge not found'
      });
    }

    Object.assign(noticeCharge, req.body);
    await noticeCharge.save();

    res.status(200).json({
      success: true,
      message: 'Notice charge updated successfully',
      data: noticeCharge.toObject()
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid notice charge ID'
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
      message: 'Error updating notice charge',
      error: error.message
    });
  }
};

export const deleteNoticeCharge = async (req, res) => {
  try {
    const noticeCharge = await NoticeCharge.findByIdAndDelete(req.params.id);

    if (!noticeCharge) {
      return res.status(404).json({
        success: false,
        message: 'Notice charge not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notice charge deleted successfully',
      data: {}
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid notice charge ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting notice charge',
      error: error.message
    });
  }
};

