import Invoice from '../models/Invoice.js';
import User from '../models/User.js';
import Unit from '../models/Unit.js';
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

export const createInvoice = async (req, res) => {
  try {
    // If invoice_id is provided and not empty, check for uniqueness
    if (req.body.invoice_id && req.body.invoice_id.trim() !== '') {
      const existing = await Invoice.findOne({ 
        invoice_id: req.body.invoice_id.toUpperCase().trim() 
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Invoice ID must be unique'
        });
      }
    } else {
      // Remove empty invoice_id to trigger auto-generation
      delete req.body.invoice_id;
    }

    // Validate customer_id if provided
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

    // Normalize unit_number to array format
    if (req.body.unit_number) {
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

    const invoice = await Invoice.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice
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

    // Optionally populate units data for each invoice
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

    Object.assign(invoice, req.body);
    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice.toObject()
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

