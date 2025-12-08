import BillingPlan from '../models/BillingPlan.js';

const buildPagination = (page, limit, total) => {
  const totalPages  = Math.ceil(total / limit) || 1;
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

export const createBillingPlan = async (req, res) => {
  try {
    const billingPlan = await BillingPlan.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Billing plan created successfully',
      data: billingPlan
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
      message: 'Error creating billing plan',
      error: error.message
    });
  }
};  

export const getBillingPlans = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const [total, billingPlans] = await Promise.all([
      BillingPlan.countDocuments(),
      BillingPlan.find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
    ]);

    res.status(200).json({
      success: true,
      count: billingPlans.length,
      pagination: buildPagination(page, limit, total),
      data: billingPlans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching billing plans.',
      error: error.message
    });
  }
};

export const getBillingPlanById = async (req, res) => {
  try {
    const billingPlan = await BillingPlan.findById(req.params.id);

    if (!billingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Billing plan not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: billingPlan
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid billing plan ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching billing plan',
      error: error.message
    });
  }
};

export const updateBillingPlan = async (req, res) => {
  try {
    const billingPlan = await BillingPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!billingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Billing plan not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Billing plan updated successfully',
      data: billingPlan
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid billing plan ID'
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
      message: 'Error updating billing plan',
      error: error.message
    });
  }
};

export const deleteBillingPlan = async (req, res) => {
  try {
    const billingPlan = await BillingPlan.findByIdAndDelete(req.params.id);

    if (!billingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Billing plan not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Billing plan deleted successfully',
      data: {}
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid billing plan ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting billing plan',
      error: error.message
    });
  }
};

