import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';
import { formatPaymentWithTransactionId } from '../utils/paymentFormatter.js';

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

/**
 * Get all payments with pagination
 * Admin only
 */
export const getAllPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Optional filters
    const filter = {};
    
    if (req.query.customer_id) {
      filter.customer_id = req.query.customer_id;
    }
    
    if (req.query.invoice_id) {
      filter.invoice_id = req.query.invoice_id;
    }
    
    if (req.query.status) {
      filter.stripe_payment_status = req.query.status;
    }

    // Get total count and payments
    const [total, payments] = await Promise.all([
      Payment.countDocuments(filter),
      Payment.find(filter)
        .populate('invoice_id', 'invoice_id invoice_title')
        .populate('customer_id', 'name email phoneNumber')
        .sort({ paid_at: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    // Format payments with requested keys (including Transaction_id from Transaction model)
    const formattedPayments = await Promise.all(
      payments.map(payment => formatPaymentWithTransactionId(payment))
    );

    res.status(200).json({
      success: true,
      data: formattedPayments,
      pagination: buildPagination(page, limit, total),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error: error.message,
    });
  }
};

/**
 * Get payment by ID
 * Admin only
 */
export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID',
      });
    }

    const payment = await Payment.findById(id)
      .populate('invoice_id', 'invoice_id invoice_title amount issue_date due_date')
      .populate('customer_id', 'name email phoneNumber');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Format payment with requested keys (including Transaction_id from Transaction model)
    const formattedPayment = await formatPaymentWithTransactionId(payment);

    res.status(200).json({
      success: true,
      data: formattedPayment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payment',
      error: error.message,
    });
  }
};

/**
 * Get payments by invoice ID
 * Admin or invoice owner
 */
export const getPaymentsByInvoiceId = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const currentUser = req.user;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID',
      });
    }

    // Check if invoice exists and verify authorization
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Authorization: Admin can see all, user can only see their own
    const userRoles = currentUser?.roles || [];
    const isAdmin = userRoles.includes('admin') || userRoles.includes('moderator');
    const isOwner = invoice.customer_id?.toString() === currentUser._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view payments for this invoice',
      });
    }

    const payments = await Payment.find({ invoice_id: invoiceId })
      .populate('invoice_id', 'invoice_id invoice_title')
      .populate('customer_id', 'name email phoneNumber')
      .sort({ paid_at: -1, createdAt: -1 });

    // Format payments with requested keys (including Transaction_id from Transaction model)
    const formattedPayments = await Promise.all(
      payments.map(payment => formatPaymentWithTransactionId(payment))
    );

    res.status(200).json({
      success: true,
      data: formattedPayments,
      count: formattedPayments.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error: error.message,
    });
  }
};

/**
 * Get payments by user ID (customer)
 * Admin or the user themselves
 */
export const getPaymentsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    // Authorization: Admin can see all, user can only see their own
    const userRoles = currentUser?.roles || [];
    const isAdmin = userRoles.includes('admin') || userRoles.includes('moderator');
    const isOwner = userId === currentUser._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view payments for this user',
      });
    }

    const filter = { customer_id: userId };

    // Get total count and payments
    const [total, payments] = await Promise.all([
      Payment.countDocuments(filter),
      Payment.find(filter)
        .populate('invoice_id', 'invoice_id invoice_title')
        .populate('customer_id', 'name email phoneNumber')
        .sort({ paid_at: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    // Format payments with requested keys (including Transaction_id from Transaction model)
    const formattedPayments = await Promise.all(
      payments.map(payment => formatPaymentWithTransactionId(payment))
    );

    // Calculate total amount paid
    const totalAmount = await Payment.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: formattedPayments,
      total_amount: totalAmount[0]?.total || 0,
      pagination: buildPagination(page, limit, total),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error: error.message,
    });
  }
};

/**
 * Generate a short transaction ID from Stripe payment intent ID or create a random one
 * @param {string} stripePaymentIntentId - Stripe payment intent ID
 * @returns {string} Short transaction ID
 */
const generateTransactionId = (stripePaymentIntentId) => {
  if (stripePaymentIntentId) {
    // Extract last 8 characters from Stripe payment intent ID (e.g., "pi_1234567890abcdef" -> "90abcdef")
    // Or use a shorter format: first 3 chars + last 5 chars
    const parts = stripePaymentIntentId.split('_');
    if (parts.length > 1) {
      const idPart = parts[parts.length - 1];
      // Take first 3 and last 5 characters
      if (idPart.length >= 8) {
        return `TRX_${idPart.substring(0, 3)}#${idPart.substring(idPart.length - 5)}`;
      }
      return `TRX_${idPart}`;
    }
    return `TRX_${stripePaymentIntentId.substring(0, 8)}`;
  }
  
  // Generate random transaction ID if no Stripe ID
  const randomNum = Math.floor(Math.random() * 1000000);
  const randomHash = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TRX_${randomNum}#${randomHash}`;
};

/**
 * Get user's own payments (client side) with formatted response
 */
export const getMyPayments = async (req, res) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const filter = { customer_id: user._id };

    // Get total count and payments with invoice status
    const [total, payments] = await Promise.all([
      Payment.countDocuments(filter),
      Payment.find(filter)
        .populate('invoice_id', 'invoice_id invoice_title amount status issue_date due_date')
        .sort({ paid_at: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    // Format payments with requested structure
    const formattedPayments = payments.map(payment => {
      const invoice = payment.invoice_id;
      
      // Generate transaction ID
      const transactionId = generateTransactionId(payment.stripe_payment_intent_id);
      
      // Format description
      const description = invoice?.invoice_title || `Invoice ${payment.invoice_number || 'N/A'}`;
      
      // Format payment method
      const paymentMethod = payment.payment_method_type || 'card';
      
      // Format status
      let status = 'pending';
      if (payment.stripe_payment_status === 'succeeded') {
        status = 'paid';
      } else if (payment.stripe_payment_status === 'failed') {
        status = 'failed';
      } else if (payment.stripe_payment_status === 'canceled') {
        status = 'canceled';
      }
      
      // Get invoice status
      const invoiceStatus = invoice?.status || 'unknown';

      return {
        date: payment.paid_at ? new Date(payment.paid_at).toISOString().split('T')[0] : 
              payment.createdAt ? new Date(payment.createdAt).toISOString().split('T')[0] : '',
        transaction_id: transactionId,
        description: description,
        amount: payment.amount,
        payment_method: paymentMethod,
        status: status,
        invoice_status: invoiceStatus
      };
    });

    // Calculate total amount paid
    const totalAmount = await Payment.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: formattedPayments,
      total_amount: totalAmount[0]?.total || 0,
      pagination: buildPagination(page, limit, total),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error: error.message,
    });
  }
};

