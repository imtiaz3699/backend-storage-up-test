import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

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

// Create a new transaction
export const createTransaction = async (req, res) => {
  try {
    // Validate status
    const status = req.body.status || 'pending';
    const allowedStatus = ['pending', 'paid'];
    if (status && !allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be one of: pending, paid"
      });
    }

    // Validate customer_id in move_out_notice_give if provided
    if (req.body.move_out_notice_give?.customer_id) {
      if (!mongoose.Types.ObjectId.isValid(req.body.move_out_notice_give.customer_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer_id format in move_out_notice_give'
        });
      }

      const customer = await User.findById(req.body.move_out_notice_give.customer_id);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found for move_out_notice_give'
        });
      }
    }

    // Validate customer_id in actual_move_out_notice if provided
    if (req.body.actual_move_out_notice?.customer_id) {
      if (!mongoose.Types.ObjectId.isValid(req.body.actual_move_out_notice.customer_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer_id format in actual_move_out_notice'
        });
      }

      const customer = await User.findById(req.body.actual_move_out_notice.customer_id);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found for actual_move_out_notice'
        });
      }
    }

    // Validate dates if provided
    if (req.body.move_out_notice_give?.date) {
      const date = new Date(req.body.move_out_notice_give.date);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format in move_out_notice_give'
        });
      }
    }

    if (req.body.actual_move_out_notice?.date) {
      const date = new Date(req.body.actual_move_out_notice.date);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format in actual_move_out_notice'
        });
      }
    }

    // Validate numeric fields
    if (req.body.move_out_notice_give?.balance_owning !== undefined) {
      if (typeof req.body.move_out_notice_give.balance_owning !== 'number' || req.body.move_out_notice_give.balance_owning < 0) {
        return res.status(400).json({
          success: false,
          message: 'balance_owning must be a non-negative number'
        });
      }
    }

    if (req.body.actual_move_out_notice?.reverse_deposit !== undefined) {
      if (typeof req.body.actual_move_out_notice.reverse_deposit !== 'number' || req.body.actual_move_out_notice.reverse_deposit < 0) {
        return res.status(400).json({
          success: false,
          message: 'reverse_deposit must be a non-negative number'
        });
      }
    }

    if (req.body.actual_move_out_notice?.final_amount_owed !== undefined) {
      if (typeof req.body.actual_move_out_notice.final_amount_owed !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'final_amount_owed must be a number'
        });
      }
    }

    const transaction = await Transaction.create({
      ...req.body,
      status
    });

    // Link transaction to user(s)
    const customerIds = [];
    if (transaction.move_out_notice_give?.customer_id) customerIds.push(transaction.move_out_notice_give.customer_id);
    if (transaction.actual_move_out_notice?.customer_id) customerIds.push(transaction.actual_move_out_notice.customer_id);
    if (customerIds.length > 0) {
      await User.updateMany(
        { _id: { $in: customerIds } },
        { $addToSet: { transactions: transaction._id } }
      );
    }

    // Populate customer data
    await transaction.populate('move_out_notice_give.customer_id', 'name email phoneNumber');
    await transaction.populate('actual_move_out_notice.customer_id', 'name email phoneNumber');

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
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
      message: 'Error creating transaction',
      error: error.message
    });
  }
};

// Get all transactions with pagination
export const getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Optional filters
    const filter = {};
    
    // Filter by customer_id in move_out_notice_give
    if (req.query.move_out_customer_id) {
      if (!mongoose.Types.ObjectId.isValid(req.query.move_out_customer_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid move_out_customer_id format'
        });
      }
      filter['move_out_notice_give.customer_id'] = req.query.move_out_customer_id;
    }

    // Filter by customer_id in actual_move_out_notice
    if (req.query.actual_move_out_customer_id) {
      if (!mongoose.Types.ObjectId.isValid(req.query.actual_move_out_customer_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid actual_move_out_customer_id format'
        });
      }
      filter['actual_move_out_notice.customer_id'] = req.query.actual_move_out_customer_id;
    }

    // Get total count
    const total = await Transaction.countDocuments(filter);

    // Get paginated transactions
    const transactions = await Transaction.find(filter)
      .populate('move_out_notice_give.customer_id', 'name email phoneNumber')
      .populate('actual_move_out_notice.customer_id', 'name email phoneNumber')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json({
      success: true,
      count: transactions.length,
      pagination: buildPagination(page, limit, total),
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions',
      error: error.message
    });
  }
};

// Get transaction by ID
export const getTransactionById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }

    const transaction = await Transaction.findById(req.params.id)
      .populate('move_out_notice_give.customer_id', 'name email phoneNumber')
      .populate('actual_move_out_notice.customer_id', 'name email phoneNumber');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching transaction',
      error: error.message
    });
  }
};

// Update transaction
export const updateTransaction = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }

    const transaction = await Transaction.findById(req.params.id);
    // Validate status if provided
    if (req.body.status) {
      const allowedStatus = ['pending', 'paid'];
      if (!allowedStatus.includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be one of: pending, paid"
        });
      }
    }

    const oldCustomerIds = [];
    if (transaction.move_out_notice_give?.customer_id) oldCustomerIds.push(transaction.move_out_notice_give.customer_id.toString());
    if (transaction.actual_move_out_notice?.customer_id) oldCustomerIds.push(transaction.actual_move_out_notice.customer_id.toString());

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Validate customer_id in move_out_notice_give if being updated
    if (req.body.move_out_notice_give?.customer_id) {
      if (!mongoose.Types.ObjectId.isValid(req.body.move_out_notice_give.customer_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer_id format in move_out_notice_give'
        });
      }

      const customer = await User.findById(req.body.move_out_notice_give.customer_id);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found for move_out_notice_give'
        });
      }
    }

    // Validate customer_id in actual_move_out_notice if being updated
    if (req.body.actual_move_out_notice?.customer_id) {
      if (!mongoose.Types.ObjectId.isValid(req.body.actual_move_out_notice.customer_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer_id format in actual_move_out_notice'
        });
      }

      const customer = await User.findById(req.body.actual_move_out_notice.customer_id);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found for actual_move_out_notice'
        });
      }
    }

    // Validate dates if provided
    if (req.body.move_out_notice_give?.date) {
      const date = new Date(req.body.move_out_notice_give.date);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format in move_out_notice_give'
        });
      }
    }

    if (req.body.actual_move_out_notice?.date) {
      const date = new Date(req.body.actual_move_out_notice.date);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format in actual_move_out_notice'
        });
      }
    }

    // Validate numeric fields
    if (req.body.move_out_notice_give?.balance_owning !== undefined) {
      if (typeof req.body.move_out_notice_give.balance_owning !== 'number' || req.body.move_out_notice_give.balance_owning < 0) {
        return res.status(400).json({
          success: false,
          message: 'balance_owning must be a non-negative number'
        });
      }
    }

    if (req.body.actual_move_out_notice?.reverse_deposit !== undefined) {
      if (typeof req.body.actual_move_out_notice.reverse_deposit !== 'number' || req.body.actual_move_out_notice.reverse_deposit < 0) {
        return res.status(400).json({
          success: false,
          message: 'reverse_deposit must be a non-negative number'
        });
      }
    }

    if (req.body.actual_move_out_notice?.final_amount_owed !== undefined) {
      if (typeof req.body.actual_move_out_notice.final_amount_owed !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'final_amount_owed must be a number'
        });
      }
    }

    // Update transaction
    Object.assign(transaction, req.body);
    await transaction.save();

    // Update user transaction references
    const newCustomerIds = [];
    if (transaction.move_out_notice_give?.customer_id) newCustomerIds.push(transaction.move_out_notice_give.customer_id.toString());
    if (transaction.actual_move_out_notice?.customer_id) newCustomerIds.push(transaction.actual_move_out_notice.customer_id.toString());

    const toAdd = newCustomerIds.filter(id => !oldCustomerIds.includes(id));
    const toRemove = oldCustomerIds.filter(id => !newCustomerIds.includes(id));

    if (toAdd.length > 0) {
      await User.updateMany(
        { _id: { $in: toAdd } },
        { $addToSet: { transactions: transaction._id } }
      );
    }
    if (toRemove.length > 0) {
      await User.updateMany(
        { _id: { $in: toRemove } },
        { $pull: { transactions: transaction._id } }
      );
    }

    // Populate customer data
    await transaction.populate('move_out_notice_give.customer_id', 'name email phoneNumber');
    await transaction.populate('actual_move_out_notice.customer_id', 'name email phoneNumber');

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID'
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
      message: 'Error updating transaction',
      error: error.message
    });
  }
};

// Delete transaction
export const deleteTransaction = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }

    const transaction = await Transaction.findByIdAndDelete(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Remove references from users
    const customerIds = [];
    if (transaction.move_out_notice_give?.customer_id) customerIds.push(transaction.move_out_notice_give.customer_id);
    if (transaction.actual_move_out_notice?.customer_id) customerIds.push(transaction.actual_move_out_notice.customer_id);
    if (customerIds.length > 0) {
      await User.updateMany(
        { _id: { $in: customerIds } },
        { $pull: { transactions: transaction._id } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
      data: {}
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting transaction',
      error: error.message
    });
  }
};

