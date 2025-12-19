import Invoice from '../models/Invoice.js';
import User from '../models/User.js';
import Unit from '../models/Unit.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';
import getStripe from '../config/stripe.js';
import { emitNotificationToUser } from '../utils/socketService.js';

const getPaymentLinkForInvoice = async (invoice) => {
  if (invoice.status !== 'pending' || invoice.amount <= 0) {
    return null;
  }
  try {
    const stripe = getStripe();
    if (invoice.stripe_checkout_session_id) {
      try {
        const session = await stripe.checkout.sessions.retrieve(
          invoice.stripe_checkout_session_id
        );
        if (session.status === 'open') {
          return session.url;
        }
      } catch (error) {
        console.log('Existing session not found, will create new one when needed');
      }
    }

    return null;
  } catch (error) {
    console.error(`Error getting payment link for invoice ${invoice.invoice_id}:`, error);
    return null;
  }
};

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

export const createInvoice = async (req, res) => {
  try {
    if (req?.body?.invoice_id && req?.body?.invoice_id?.trim() !== '') {
      const existing = await Invoice.findOne({ 
        invoice_id: req?.body?.invoice_id?.toUpperCase().trim() 
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Invoice ID must be unique'
        });
      }
    } else {
      delete req?.body?.invoice_id;
    }
    if (req?.body?.customer_id) {
      if (!mongoose.Types.ObjectId.isValid(req?.body?.customer_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer_id format'
        });
      }
      const user = await User.findById(req?.body?.customer_id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found with the provided customer_id.'
        });
      }
    }
    if (req?.body?.unit_number) {
      if (typeof req.body.unit_number === 'string') {
        req.body.unit_number = [req.body.unit_number.trim()];
      } else if (Array.isArray(req.body.unit_number)) {
        req.body.unit_number = req.body.unit_number
          .map(num => typeof num === 'string' ? num.trim() : String(num).trim())
          .filter(num => num !== '');
      }
      if (!Array.isArray(req.body.unit_number) || req.body.unit_number.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one unit number is required'
        });
      }
      const units = await Unit.find({ unit_number: { $in: req.body.unit_number } });
      const foundUnitNumbers = units.map(u => u.unit_number);
      const missingUnits = req.body.unit_number.filter(num => !foundUnitNumbers.includes(num));
      
      if (missingUnits.length > 0) {
        return res.status(404).json({
          success: false,
          message: `Units not found: ${missingUnits.join(', ')}`
        });
      }
    }
    if (!req.body.customer_email && req.body.customer_id) {
      try {
        const user = await User.findById(req.body.customer_id).select('email name');
        if (user && user.email) {
          req.body.customer_email = user.email.toLowerCase().trim();
          if (!req.body.customer_name && user.name) {
            req.body.customer_name = user.name;
          }
        } else {
          console.warn(`⚠️  User not found or has no email for customer_id: ${req.body.customer_id}`);
        }
      } catch (error) {
        console.error(`❌ Error looking up User for customer_email:`, error.message);
      }
    }

    const invoice = await Invoice.create(req.body);
    const invoiceData = invoice.toObject();
    if (invoice.status === 'pending' && invoice.amount > 0) {
      try {
        const freshInvoice = await Invoice.findById(invoice._id);
        if (freshInvoice) {          
          const paymentLink = await createStripeCheckoutSessionForInvoice(freshInvoice);
          
          if (paymentLink) {
            invoiceData.payment_link = paymentLink;
          } else {
            invoiceData.payment_link = null;
          }
          const updatedInvoice = await Invoice.findById(invoice._id);
          if (updatedInvoice) {
            invoiceData.stripe_checkout_session_id = updatedInvoice.stripe_checkout_session_id;
            invoiceData.stripe_payment_status = updatedInvoice.stripe_payment_status;
          }
        }
      } catch (error) {
        invoiceData.payment_link = null;
      }
    } else {
      invoiceData.payment_link = null;
    }
    if (invoice.customer_id) {
      try {
        const notification = await Notification.create({
          user_id: invoice.customer_id,
          type: 'invoice_created',
          title: 'New Invoice Created',
          message: `A new invoice ${invoice.invoice_id} has been created for you. Amount: $${invoice.amount.toFixed(2)}`,
          data: {
            invoice_id: invoice._id.toString(),
            invoice_number: invoice.invoice_id,
            amount: invoice.amount,
            due_date: invoice.due_date,
            status: invoice.status
          }
        });
        emitNotificationToUser(invoice.customer_id.toString(), {
          id: notification._id.toString(),
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          read: notification.read,
          createdAt: notification.createdAt
        });

        console.log(`📢 Notification sent to customer ${invoice.customer_id} for invoice ${invoice.invoice_id}`);
      } catch (error) {
        console.error(`❌ Error sending notification for invoice ${invoice.invoice_id}:`, error.message);
      }
    }

    // Send notification to admins about new invoice creation
    try {
      const { emitNotificationToAdmin } = await import('../utils/socketService.js');
      await emitNotificationToAdmin({
        type: 'invoice_created',
        title: 'New Invoice Created',
        message: `Invoice ${invoice.invoice_id} created for ${invoice.customer_name || 'Customer'} - $${invoice.amount.toFixed(2)}`,
        priority: 'medium',
        data: {
          invoice_id: invoice._id.toString(),
          invoice_number: invoice.invoice_id,
          customer_id: invoice.customer_id?.toString(),
          customer_name: invoice.customer_name,
          customer_email: invoice.customer_email,
          amount: invoice.amount,
          due_date: invoice.due_date,
          status: invoice.status,
          created_at: invoice.createdAt
        }
      });
      console.log(`📢 Admin notification sent for new invoice ${invoice.invoice_id}`);
    } catch (adminNotificationError) {
      console.error(`❌ Failed to send admin notification for invoice creation:`, adminNotificationError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoiceData
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
        message: 'Invoice ID must be unique'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating invoice',
      error: error.message
    });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const { customer_name, status, sortBy, unit_number } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter = {};
    
    // Filter by customer name (case-insensitive partial match)
    if (customer_name && customer_name.trim() !== '') {
      filter.customer_name = { $regex: customer_name.trim(), $options: 'i' };
    }
    
    // Filter by status (exact match, case-insensitive)
    if (status && status.trim() !== '') {
      const statusLower = status.trim().toLowerCase();
      // Validate status is one of the allowed values
      const allowedStatuses = ['pending', 'paid', 'overdue', 'cancelled'];
      if (allowedStatuses.includes(statusLower)) {
        filter.status = statusLower;
      }
    }

    // Filter by unit_number (supports single string or comma-separated values)
    if (unit_number && unit_number.trim() !== '') {
      // Split by comma if multiple unit numbers provided
      const unitNumbers = unit_number.split(',').map(num => num.trim()).filter(num => num !== '');
      if (unitNumbers.length > 0) {
        filter.unit_number = { $in: unitNumbers };
      }
    }

    // Build sort query
    let sortQuery = { createdAt: -1 }; // Default: newest first
    
    if (sortBy && sortBy.trim() !== '') {
      const sortByLower = sortBy.trim().toLowerCase();
      
      if (sortByLower === 'by_date') {
        // Sort by issue_date (newest first)
        sortQuery = { issue_date: -1 };
      } else if (sortByLower === 'by_status') {
        // Sort by status alphabetically
        sortQuery = { status: 1 };
      }
      // If invalid sortBy, use default
    }

    // Check if populate is requested (default: false for performance)
    const populate = req.query.populate === 'true' || req.query.populate === '1';
    
    let invoiceQuery = Invoice.find(filter)
      .skip(skip)
      .limit(limit)
      .sort(sortQuery);
    
    // Optionally populate customer data
    if (populate) {
      invoiceQuery = invoiceQuery.populate('customer_id', 'name first_name last_name email phoneNumber');
    }

    const [total, invoices] = await Promise.all([
      Invoice.countDocuments(filter),
      invoiceQuery
    ]);

    // Optionally populate units data and payment links for each invoice
    let invoicesData = invoices;
    if (populate) {
      invoicesData = await Promise.all(
        invoices.map(async (invoice) => {
          const invoiceObj = invoice.toObject();
          if (invoice.unit_number && Array.isArray(invoice.unit_number) && invoice.unit_number.length > 0) {
            const units = await Unit.find({ unit_number: { $in: invoice.unit_number } });
            invoiceObj.units = units;
          } else {
            invoiceObj.units = [];
          }
          // Add payment link if invoice is pending
          const paymentLink = await getPaymentLinkForInvoice(invoice);
          invoiceObj.payment_link = paymentLink;
          return invoiceObj;
        })
      );
    } else {
      // Even if not populating, add payment links
      invoicesData = await Promise.all(
        invoices.map(async (invoice) => {
          const invoiceObj = invoice.toObject();
          const paymentLink = await getPaymentLinkForInvoice(invoice);
          invoiceObj.payment_link = paymentLink;
          return invoiceObj;
        })
      );
    }

    res.status(200).json({
      success: true,
      count: invoicesData.length,
      pagination: buildPagination(page, limit, total),
      data: invoicesData,
      filter: {
        ...(customer_name && { customer_name: customer_name.trim() }),
        ...(status && { status: status.trim().toLowerCase() }),
        ...(sortBy && { sortBy: sortBy.trim().toLowerCase() }),
        ...(unit_number && { unit_number: unit_number.trim() })
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching invoices',
      error: error.message
    });
  }
};

export const getInvoicesByCustomerId = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const { status, sortBy, unit_number } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Validate customer_id
    if (!mongoose.Types.ObjectId.isValid(customer_id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer_id format'
      });
    }

    // Check if customer exists
    const customer = await User.findById(customer_id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Build filter query
    const filter = { customer_id };
    
    // Filter by status (exact match, case-insensitive)
    if (status && status.trim() !== '') {
      const statusLower = status.trim().toLowerCase();
      const allowedStatuses = ['pending', 'paid', 'overdue', 'cancelled'];
      if (allowedStatuses.includes(statusLower)) {
        filter.status = statusLower;
      }
    }

    // Filter by unit_number (supports single string or comma-separated values)
    if (unit_number && unit_number.trim() !== '') {
      const unitNumbers = unit_number.split(',').map(num => num.trim()).filter(num => num !== '');
      if (unitNumbers.length > 0) {
        filter.unit_number = { $in: unitNumbers };
      }
    }

    // Build sort query
    let sortQuery = { createdAt: -1 }; // Default: newest first
    
    if (sortBy && sortBy.trim() !== '') {
      const sortByLower = sortBy.trim().toLowerCase();
      
      if (sortByLower === 'by_date') {
        sortQuery = { issue_date: -1 };
      } else if (sortByLower === 'by_status') {
        sortQuery = { status: 1 };
      }
    }

    // Check if populate is requested (default: true for customer-specific invoices)
    const populate = req.query.populate !== 'false';
    
    let invoiceQuery = Invoice.find(filter)
      .skip(skip)
      .limit(limit)
      .sort(sortQuery);
    
    // Populate customer data by default
    if (populate) {
      invoiceQuery = invoiceQuery.populate('customer_id', 'name first_name last_name email phoneNumber');
    }

    const [total, invoices] = await Promise.all([
      Invoice.countDocuments(filter),
      invoiceQuery
    ]);

    // Populate units data and payment links for each invoice
    let invoicesData = invoices;
    if (populate) {
      invoicesData = await Promise.all(
        invoices.map(async (invoice) => {
          const invoiceObj = invoice.toObject();
          if (invoice.unit_number && Array.isArray(invoice.unit_number) && invoice.unit_number.length > 0) {
            const units = await Unit.find({ unit_number: { $in: invoice.unit_number } });
            invoiceObj.units = units;
          } else {
            invoiceObj.units = [];
          }
          // Add payment link if invoice is pending
          const paymentLink = await getPaymentLinkForInvoice(invoice);
          invoiceObj.payment_link = paymentLink;
          return invoiceObj;
        })
      );
    } else {
      // Even if not populating, add payment links
      invoicesData = await Promise.all(
        invoices.map(async (invoice) => {
          const invoiceObj = invoice.toObject();
          const paymentLink = await getPaymentLinkForInvoice(invoice);
          invoiceObj.payment_link = paymentLink;
          return invoiceObj;
        })
      );
    }

    res.status(200).json({
      success: true,
      count: invoicesData.length,
      pagination: buildPagination(page, limit, total),
      data: invoicesData,
      customer: {
        _id: customer._id,
        name: customer.name,
        email: customer.email
      },
      filter: {
        customer_id,
        ...(status && { status: status.trim().toLowerCase() }),
        ...(sortBy && { sortBy: sortBy.trim().toLowerCase() }),
        ...(unit_number && { unit_number: unit_number.trim() })
      }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer_id format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching invoices by customer_id',
      error: error.message
    });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    // Check if populate is requested (default: true for single invoice)
    const populate = req.query.populate !== 'false';
    
    let invoiceQuery = Invoice.findById(req.params.id);
    
    // Populate customer data by default for single invoice
    if (populate) {
      invoiceQuery = invoiceQuery.populate('customer_id', 'name first_name last_name email phoneNumber');
    }
    
    const invoice = await invoiceQuery;

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Convert invoice to object to add unit data
    const invoiceData = invoice.toObject();

    // Find units based on unit_number array
    if (invoice.unit_number && Array.isArray(invoice.unit_number) && invoice.unit_number.length > 0) {
      const units = await Unit.find({ unit_number: { $in: invoice.unit_number } });
      invoiceData.units = units; // Changed to plural 'units' since it's an array
    } else {
      invoiceData.units = [];
    }

    // Add payment link if invoice is pending
    const paymentLink = await getPaymentLinkForInvoice(invoice);
    invoiceData.payment_link = paymentLink;

    res.status(200).json({
      success: true,
      data: invoiceData
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching invoice',
      error: error.message
    });
  }
};

export const getInvoiceByInvoiceId = async (req, res) => {
  try {
    // Check if populate is requested (default: true for single invoice)
    const populate = req.query.populate !== 'false';
    
    let invoiceQuery = Invoice.findOne({ 
      invoice_id: req.params.invoiceId.toUpperCase() 
    });
    
    // Populate customer data by default for single invoice
    if (populate) {
      invoiceQuery = invoiceQuery.populate('customer_id', 'name first_name last_name email phoneNumber');
    }
    
    const invoice = await invoiceQuery;

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Convert invoice to object to add unit data
    const invoiceData = invoice.toObject();

    // Find units based on unit_number array
    if (invoice.unit_number && Array.isArray(invoice.unit_number) && invoice.unit_number.length > 0) {
      const units = await Unit.find({ unit_number: { $in: invoice.unit_number } });
      invoiceData.units = units; // Changed to plural 'units' since it's an array
    } else {
      invoiceData.units = [];
    }

    // Add payment link if invoice is pending
    const paymentLink = await getPaymentLinkForInvoice(invoice);
    invoiceData.payment_link = paymentLink;

    res.status(200).json({
      success: true,
      data: invoiceData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice',
      error: error.message
    });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // If invoice_id is being updated, check for uniqueness
    if (req.body.invoice_id && req.body.invoice_id.toUpperCase() !== invoice.invoice_id) {
      const existing = await Invoice.findOne({ 
        invoice_id: req.body.invoice_id.toUpperCase() 
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Invoice ID must be unique'
        });
      }
    }

    // Ensure invoice_id is uppercase if provided
    if (req.body.invoice_id) {
      req.body.invoice_id = req.body.invoice_id.toUpperCase();
    }

    // Validate customer_id if being updated
    if (req.body.customer_id) {
      // Check if customer_id is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(req.body.customer_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer_id format'
        });
      }

      // Check if the user exists
      const user = await User.findById(req.body.customer_id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found with the provided customer_id'
        });
      }
    }

    // Normalize unit_number to array format if being updated
    if (req.body.unit_number !== undefined) {
      // If it's a string, convert to array
      if (typeof req.body.unit_number === 'string') {
        req.body.unit_number = [req.body.unit_number.trim()];
      } else if (Array.isArray(req.body.unit_number)) {
        // Trim and filter empty strings
        req.body.unit_number = req.body.unit_number
          .map(num => typeof num === 'string' ? num.trim() : String(num).trim())
          .filter(num => num !== '');
      }

      // Validate that we have at least one unit number
      if (!Array.isArray(req.body.unit_number) || req.body.unit_number.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one unit number is required'
        });
      }

      // Validate that all unit numbers exist
      const units = await Unit.find({ unit_number: { $in: req.body.unit_number } });
      const foundUnitNumbers = units.map(u => u.unit_number);
      const missingUnits = req.body.unit_number.filter(num => !foundUnitNumbers.includes(num));
      
      if (missingUnits.length > 0) {
        return res.status(404).json({
          success: false,
          message: `Units not found: ${missingUnits.join(', ')}`
        });
      }
    }

    // Check if status is being changed to 'paid' (for notification)
    const wasPaid = invoice.status === 'paid';
    const isBeingPaid = req.body.status === 'paid' && !wasPaid;
    const oldStatus = invoice.status;
    const newStatus = req.body.status || invoice.status;

    Object.assign(invoice, req.body);
    await invoice.save();

    // Send notification if invoice was just marked as paid
    if (isBeingPaid && invoice.customer_id) {
      try {
        const notification = await Notification.create({
          user_id: invoice.customer_id,
          type: 'invoice_paid',
          title: 'Payment Received',
          message: `Your invoice ${invoice.invoice_id} has been marked as paid. Amount: $${invoice.amount.toFixed(2)}`,
          data: {
            invoice_id: invoice._id.toString(),
            invoice_number: invoice.invoice_id,
            amount: invoice.amount,
            paid_at: invoice.paid_at || new Date(),
            status: 'paid'
          }
        });

        // Emit socket notification
        emitNotificationToUser(invoice.customer_id.toString(), {
          id: notification._id.toString(),
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          read: notification.read,
          createdAt: notification.createdAt
        });

        console.log(`🔔 Payment notification sent to user ${invoice.customer_id} for invoice ${invoice.invoice_id}`);
      } catch (notificationError) {
        console.error(`❌ Failed to send payment notification for invoice ${invoice.invoice_id}:`, notificationError.message);
      }
    }

    // Send notification to admins about invoice update (if status changed or important fields updated)
    if (oldStatus !== newStatus || req.body.amount || req.body.due_date) {
      try {
        const { emitNotificationToAdmin } = await import('../utils/socketService.js');
        await emitNotificationToAdmin({
          type: 'invoice_updated',
          title: 'Invoice Updated',
          message: `Invoice ${invoice.invoice_id} updated - Status: ${oldStatus} → ${newStatus || oldStatus}`,
          priority: 'medium',
          data: {
            invoice_id: invoice._id.toString(),
            invoice_number: invoice.invoice_id,
            customer_id: invoice.customer_id?.toString(),
            customer_name: invoice.customer_name,
            old_status: oldStatus,
            new_status: newStatus || oldStatus,
            amount: invoice.amount,
            due_date: invoice.due_date,
            updated_at: invoice.updatedAt
          }
        });
        console.log(`📢 Admin notification sent for invoice update ${invoice.invoice_id}`);
      } catch (adminNotificationError) {
        console.error(`❌ Failed to send admin notification for invoice update:`, adminNotificationError.message);
      }
    }

    // Get payment link if invoice is pending
    const invoiceData = invoice.toObject();
    const paymentLink = await getPaymentLinkForInvoice(invoice);
    invoiceData.payment_link = paymentLink;

    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoiceData
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID'
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
        message: 'Invoice ID must be unique'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating invoice',
      error: error.message
    });
  }
};

// Helper function to create Stripe Checkout Session for an invoice
// Returns the checkout URL if successful, null otherwise
const createStripeCheckoutSessionForInvoice = async (invoice) => {
  try {
    console.log(`🔵 Creating Stripe session for invoice ${invoice.invoice_id}...`);
    
    // Get user information
    let customerEmail = invoice.customer_email;
    let customerName = invoice.customer_name;
    let stripeCustomerId = null;

    // If no email in invoice, get it from customer_id (User model)
    if (!customerEmail && invoice.customer_id) {
      console.log(`   Looking up User model by customer_id: ${invoice.customer_id}`);
      try {
        const user = await User.findById(invoice.customer_id).select('email name stripe_customer_id');
        if (user && user.email) {
          customerEmail = user.email.toLowerCase().trim();
          customerName = user.name || invoice.customer_name || 'Customer';
          stripeCustomerId = user.stripe_customer_id || null;
          console.log(`   ✅ Found User email: ${customerEmail}`);
        } else {
          console.error(`   ❌ User not found or has no email for customer_id: ${invoice.customer_id}`);
        }
      } catch (error) {
        console.error(`   ❌ Error looking up User:`, error.message);
      }
    }

    if (!customerEmail) {
      console.error(`❌ Cannot create Stripe session for invoice ${invoice.invoice_id}: No customer email found (invoice.email=${invoice.customer_email}, customer_id=${invoice.customer_id})`);
      return null;
    }
    
    console.log(`   Using customer email: ${customerEmail}`);
    console.log(`   Invoice amount: ${invoice.amount} (will convert to cents: ${Math.round(invoice.amount * 100)})`);

    const stripe = getStripe();
    let baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    // Remove trailing slash to avoid double slashes
    baseUrl = baseUrl.replace(/\/+$/, '');
    
    console.log(`   Creating Stripe session with baseUrl: ${baseUrl}`);

    // Validate amount
    const amountInCents = Math.round(invoice.amount * 100);
    if (amountInCents < 50) { // Stripe minimum is $0.50
      console.error(`❌ Amount too low: $${invoice.amount} (minimum is $0.50)`);
      return null;
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: invoice.invoice_title || `Invoice ${invoice.invoice_id}`,
              description: `Payment for ${invoice.invoice_title || `Invoice ${invoice.invoice_id}`}. Units: ${invoice.unit_number?.join(', ') || 'N/A'}`,
            },
            unit_amount: amountInCents, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/invoices/${invoice._id}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/invoices/${invoice._id}/payment/cancel`,
      // Stripe allows only one: either 'customer' (Stripe customer ID) or 'customer_email'
      // Prefer Stripe customer ID if available, otherwise use email
      ...(stripeCustomerId ? { customer: stripeCustomerId } : { customer_email: customerEmail }),
      metadata: {
        invoice_id: invoice._id.toString(),
        invoice_number: invoice.invoice_id,
        customer_id: invoice.customer_id?.toString() || '',
      },
    });

    // Save checkout session ID to invoice
    invoice.stripe_checkout_session_id = session.id;
    invoice.stripe_payment_status = 'pending';
    await invoice.save();

    console.log(`✅ Stripe checkout session created for invoice ${invoice.invoice_id}: ${session.id}`);
    return session.url; // Return the checkout URL
  } catch (error) {
    console.error(`❌ Error creating Stripe checkout session for invoice ${invoice.invoice_id}:`, error.message);
    // Don't throw - invoice creation should succeed even if Stripe session creation fails
    return null;
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully',
      data: {}
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting invoice',
      error: error.message
    });
  }
};

