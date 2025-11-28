import Invoice from '../models/Invoice.js';

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
    const { customer_name, status, sortBy } = req.query;
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

    const [total, invoices] = await Promise.all([
      Invoice.countDocuments(filter),
      Invoice.find(filter)
        .skip(skip)
        .limit(limit)
        .sort(sortQuery)
    ]);

    res.status(200).json({
      success: true,
      count: invoices.length,
      pagination: buildPagination(page, limit, total),
      data: invoices,
      filter: {
        ...(customer_name && { customer_name: customer_name.trim() }),
        ...(status && { status: status.trim().toLowerCase() }),
        ...(sortBy && { sortBy: sortBy.trim().toLowerCase() })
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
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
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
    const invoice = await Invoice.findOne({ 
      invoice_id: req.params.invoiceId.toUpperCase() 
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
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

