import NoticeSetup from '../models/NoticeSetup.js';
import mongoose from 'mongoose';

// Helper to auto-generate notice_plan_number in format NTCP__001, NTCP__002, ...
const generateNextNoticePlanNumber = async () => {
  const latest = await NoticeSetup.findOne(
    { notice_plan_number: { $regex: /^NTCP__\d+$/ } },
    { notice_plan_number: 1 }
  ).sort({ notice_plan_number: -1 });

  let nextNumber = 1;
  if (latest?.notice_plan_number) {
    const match = latest.notice_plan_number.match(/^NTCP__0*(\d+)$/);
    if (match && match[1]) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `NTCP__${String(nextNumber).padStart(3, '0')}`;
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

export const createNoticeSetup = async (req, res) => {
  try {
    // Auto-generate notice_plan_number if not provided
    if (!req.body.notice_plan_number) {
      req.body.notice_plan_number = await generateNextNoticePlanNumber();
    }

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

    // Prevent manual overwrite of notice_plan_number; if missing, backfill
    if (req.body.notice_plan_number !== undefined) {
      delete req.body.notice_plan_number;
    }
    if (!noticeSetup.notice_plan_number) {
      noticeSetup.notice_plan_number = await generateNextNoticePlanNumber();
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

export const updateNoticeDesign = async (req, res) => {
  try {
    // Check if document exists using lean() to avoid any validation
    const noticeSetup = await NoticeSetup.findById(req.params.id).lean();

    if (!noticeSetup) {
      return res.status(404).json({
        success: false,
        message: 'Notice setup not found'
      });
    }

    // Check if payload has notice_design key
    if (!req.body.notice_design) {
      return res.status(400).json({
        success: false,
        message: 'notice_design field is required'
      });
    }

    // Extract only valid notice_design keys
    const validKeys = ['letter_content', 'email', 'text_message'];
    const providedKeys = Object.keys(req.body.notice_design);
    const invalidKeys = providedKeys.filter(key => !validKeys.includes(key));

    // Reject if there are any invalid keys
    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid keys in notice_design: ${invalidKeys.join(', ')}. Only 'letter_content', 'email', and 'text_message' are allowed.`
      });
    }

    // Check for any other keys outside notice_design
    const bodyKeys = Object.keys(req.body);
    const otherKeys = bodyKeys.filter(key => key !== 'notice_design');
    if (otherKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Only 'notice_design' field is allowed. Found additional keys: ${otherKeys.join(', ')}`
      });
    }

    // Validate email structure if provided
    if (req.body.notice_design.email) {
      const emailKeys = Object.keys(req.body.notice_design.email);
      const validEmailKeys = ['email_subject', 'email_content'];
      const invalidEmailKeys = emailKeys.filter(key => !validEmailKeys.includes(key));
      
      if (invalidEmailKeys.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid keys in notice_design.email: ${invalidEmailKeys.join(', ')}. Only 'email_subject' and 'email_content' are allowed.`
        });
      }
    }

    // Merge with existing notice_design
    const existingDesign = noticeSetup.notice_design || {};
    const updatedNoticeDesign = {
      letter_content: req.body.notice_design.letter_content !== undefined 
        ? req.body.notice_design.letter_content 
        : existingDesign.letter_content || '',
      text_message: req.body.notice_design.text_message !== undefined 
        ? req.body.notice_design.text_message 
        : existingDesign.text_message || '',
      email: {
        email_subject: req.body.notice_design.email?.email_subject !== undefined 
          ? req.body.notice_design.email.email_subject 
          : existingDesign.email?.email_subject || '',
        email_content: req.body.notice_design.email?.email_content !== undefined 
          ? req.body.notice_design.email.email_content 
          : existingDesign.email?.email_content || ''
      }
    };

    // If notice_plan_number missing, backfill it
    let noticePlanNumber = noticeSetup.notice_plan_number;
    if (!noticePlanNumber) {
      noticePlanNumber = await generateNextNoticePlanNumber();
    }

    // Use native MongoDB collection to completely bypass Mongoose validation
    const collection = mongoose.connection.db.collection(NoticeSetup.collection.name);
    const updateResult = await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { notice_design: updatedNoticeDesign, notice_plan_number: noticePlanNumber } }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notice setup not found'
      });
    }

    // Fetch the updated document using lean() to avoid any validation
    const updatedNoticeSetup = await NoticeSetup.findById(req.params.id).lean();

    res.status(200).json({
      success: true,
      message: 'Notice design updated successfully',
      data: updatedNoticeSetup
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
      message: 'Error updating notice design',
      error: error.message
    });
  }
};

export const createNoticeCharges = async (req, res) => {
  try {
    if (!req.body.notice_charges) {
      return res.status(400).json({
        success: false,
        message: 'notice_charges field is required'
      });
    }

    const bodyKeys = Object.keys(req.body);
    const otherKeys = bodyKeys.filter((key) => key !== 'notice_charges');
    if (otherKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Only 'notice_charges' field is allowed. Found additional keys: ${otherKeys.join(', ')}`
      });
    }

    const validNoticeChargesKeys = ['notice_fee_setup'];
    const providedNoticeChargesKeys = Object.keys(req.body.notice_charges);
    const invalidNoticeChargesKeys = providedNoticeChargesKeys.filter((key) => !validNoticeChargesKeys.includes(key));
    if (invalidNoticeChargesKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid keys in notice_charges: ${invalidNoticeChargesKeys.join(', ')}. Only 'notice_fee_setup' is allowed.`
      });
    }

    const feeSetup = req.body.notice_charges.notice_fee_setup || {};
    const validFeeSetupKeys = [
      'simplified_charge_system',
      'tiered_charge_system',
      'fee_options',
      'fee_on_one_month',
      'charge_is_per_unit',
      'analysis_code_to_assign',
      'invoicing_fee'
    ];
    const providedFeeSetupKeys = Object.keys(feeSetup);
    const invalidFeeSetupKeys = providedFeeSetupKeys.filter((key) => !validFeeSetupKeys.includes(key));
    if (invalidFeeSetupKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid keys in notice_charges.notice_fee_setup: ${invalidFeeSetupKeys.join(', ')}.`
      });
    }

    if (feeSetup.simplified_charge_system) {
      const simplifiedKeys = Object.keys(feeSetup.simplified_charge_system);
      const validSimplifiedKeys = ['minimum_charge', 'minimum_percentage'];
      const invalidSimplifiedKeys = simplifiedKeys.filter((key) => !validSimplifiedKeys.includes(key));
      if (invalidSimplifiedKeys.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid keys in notice_charges.notice_fee_setup.simplified_charge_system: ${invalidSimplifiedKeys.join(', ')}.`
        });
      }
    }

    if (feeSetup.invoicing_fee) {
      const invoicingKeys = Object.keys(feeSetup.invoicing_fee);
      const validInvoicingKeys = ['fee_to_charge_customer', 'analysis_code_to_assing'];
      const invalidInvoicingKeys = invoicingKeys.filter((key) => !validInvoicingKeys.includes(key));
      if (invalidInvoicingKeys.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid keys in notice_charges.notice_fee_setup.invoicing_fee: ${invalidInvoicingKeys.join(', ')}.`
        });
      }
    }

    const noticePlanNumber =
      req.body.notice_plan_number || (await generateNextNoticePlanNumber());

    const doc = {
      notice_plan_number: noticePlanNumber,
      notice_charges: req.body.notice_charges,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const collection = mongoose.connection.db.collection(NoticeSetup.collection.name);
    const insertResult = await collection.insertOne(doc);

    const created = await collection.findOne({ _id: insertResult.insertedId });

    res.status(201).json({
      success: true,
      message: 'Notice charges record created successfully',
      data: created
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
      message: 'Error creating notice charges record',
      error: error.message
    });
  }
};

export const createNoticeDesignOnly = async (req, res) => {
  try {
    if (!req.body.notice_design) {
      return res.status(400).json({
        success: false,
        message: 'notice_design field is required'
      });
    }

    const bodyKeys = Object.keys(req.body);
    const otherKeys = bodyKeys.filter((key) => key !== 'notice_design');
    if (otherKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Only 'notice_design' field is allowed. Found additional keys: ${otherKeys.join(', ')}`
      });
    }

    // Validate notice_design keys
    const validKeys = ['letter_content', 'email', 'text_message'];
    const providedKeys = Object.keys(req.body.notice_design);
    const invalidKeys = providedKeys.filter((key) => !validKeys.includes(key));
    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid keys in notice_design: ${invalidKeys.join(', ')}. Only 'letter_content', 'email', and 'text_message' are allowed.`
      });
    }

    // Validate email keys if provided
    if (req.body.notice_design.email) {
      const emailKeys = Object.keys(req.body.notice_design.email);
      const validEmailKeys = ['email_subject', 'email_content'];
      const invalidEmailKeys = emailKeys.filter((key) => !validEmailKeys.includes(key));
      if (invalidEmailKeys.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid keys in notice_design.email: ${invalidEmailKeys.join(', ')}. Only 'email_subject' and 'email_content' are allowed.`
        });
      }
    }

    const noticeDesign = {
      letter_content: req.body.notice_design.letter_content?.trim?.() || '',
      text_message: req.body.notice_design.text_message?.trim?.() || '',
      email: {
        email_subject: req.body.notice_design.email?.email_subject?.trim?.() || '',
        email_content: req.body.notice_design.email?.email_content?.trim?.() || ''
      }
    };

    // Insert using native collection to bypass other required fields
    const collection = mongoose.connection.db.collection(NoticeSetup.collection.name);
    const noticePlanNumber =
      req.body.notice_plan_number || (await generateNextNoticePlanNumber());

    const doc = {
      notice_plan_number: noticePlanNumber,
      notice_design: noticeDesign,
      // keep other fields empty/default
      notice_charges: {},
      notice_options: {},
      access_control_triggers: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const insertResult = await collection.insertOne(doc);
    const created = await collection.findOne({ _id: insertResult.insertedId });

    res.status(201).json({
      success: true,
      message: 'Notice setup created successfully (notice_design only)',
      data: created
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating notice setup',
      error: error.message
    });
  }
};

export const updateNoticeCharges = async (req, res) => {
  try {
    const noticeSetup = await NoticeSetup.findById(req.params.id).lean();

    if (!noticeSetup) {
      return res.status(404).json({
        success: false,
        message: 'Notice setup not found'
      });
    }

    if (!req.body.notice_charges) {
      return res.status(400).json({
        success: false,
        message: 'notice_charges field is required'
      });
    }

    const bodyKeys = Object.keys(req.body);
    const otherKeys = bodyKeys.filter((key) => key !== 'notice_charges');
    if (otherKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Only 'notice_charges' field is allowed. Found additional keys: ${otherKeys.join(', ')}`
      });
    }

    const validNoticeChargesKeys = ['notice_fee_setup'];
    const providedNoticeChargesKeys = Object.keys(req.body.notice_charges);
    const invalidNoticeChargesKeys = providedNoticeChargesKeys.filter((key) => !validNoticeChargesKeys.includes(key));
    if (invalidNoticeChargesKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid keys in notice_charges: ${invalidNoticeChargesKeys.join(', ')}. Only 'notice_fee_setup' is allowed.`
      });
    }

    const feeSetup = req.body.notice_charges.notice_fee_setup || {};
    const validFeeSetupKeys = [
      'simplified_charge_system',
      'tiered_charge_system',
      'fee_options',
      'fee_on_one_month',
      'charge_is_per_unit',
      'analysis_code_to_assign',
      'invoicing_fee'
    ];
    const providedFeeSetupKeys = Object.keys(feeSetup);
    const invalidFeeSetupKeys = providedFeeSetupKeys.filter((key) => !validFeeSetupKeys.includes(key));
    if (invalidFeeSetupKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid keys in notice_charges.notice_fee_setup: ${invalidFeeSetupKeys.join(', ')}.`
      });
    }

    if (feeSetup.simplified_charge_system) {
      const simplifiedKeys = Object.keys(feeSetup.simplified_charge_system);
      const validSimplifiedKeys = ['minimum_charge', 'minimum_percentage'];
      const invalidSimplifiedKeys = simplifiedKeys.filter((key) => !validSimplifiedKeys.includes(key));
      if (invalidSimplifiedKeys.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid keys in notice_charges.notice_fee_setup.simplified_charge_system: ${invalidSimplifiedKeys.join(', ')}.`
        });
      }
    }

    if (feeSetup.invoicing_fee) {
      const invoicingKeys = Object.keys(feeSetup.invoicing_fee);
      const validInvoicingKeys = ['fee_to_charge_customer', 'analysis_code_to_assing'];
      const invalidInvoicingKeys = invoicingKeys.filter((key) => !validInvoicingKeys.includes(key));
      if (invalidInvoicingKeys.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid keys in notice_charges.notice_fee_setup.invoicing_fee: ${invalidInvoicingKeys.join(', ')}.`
        });
      }
    }

    const existingCharges = noticeSetup.notice_charges || {};
    const existingFeeSetup = existingCharges.notice_fee_setup || {};
    const existingSimplified = existingFeeSetup.simplified_charge_system || {};
    const existingInvoicing = existingFeeSetup.invoicing_fee || {};

    const updatedNoticeCharges = {
      notice_fee_setup: {
        simplified_charge_system: {
          minimum_charge:
            feeSetup.simplified_charge_system?.minimum_charge !== undefined
              ? feeSetup.simplified_charge_system.minimum_charge
              : existingSimplified.minimum_charge || 0,
          minimum_percentage:
            feeSetup.simplified_charge_system?.minimum_percentage !== undefined
              ? feeSetup.simplified_charge_system.minimum_percentage
              : existingSimplified.minimum_percentage || 0
        },
        tiered_charge_system:
          feeSetup.tiered_charge_system !== undefined
            ? feeSetup.tiered_charge_system
            : existingFeeSetup.tiered_charge_system || '',
        fee_options:
          feeSetup.fee_options !== undefined ? feeSetup.fee_options : existingFeeSetup.fee_options || false,
        fee_on_one_month:
          feeSetup.fee_on_one_month !== undefined ? feeSetup.fee_on_one_month : existingFeeSetup.fee_on_one_month || false,
        charge_is_per_unit:
          feeSetup.charge_is_per_unit !== undefined
            ? feeSetup.charge_is_per_unit
            : existingFeeSetup.charge_is_per_unit || false,
        analysis_code_to_assign:
          feeSetup.analysis_code_to_assign !== undefined
            ? feeSetup.analysis_code_to_assign
            : existingFeeSetup.analysis_code_to_assign || '',
        invoicing_fee: {
          fee_to_charge_customer:
            feeSetup.invoicing_fee?.fee_to_charge_customer !== undefined
              ? feeSetup.invoicing_fee.fee_to_charge_customer
              : existingInvoicing.fee_to_charge_customer || 0,
          analysis_code_to_assing:
            feeSetup.invoicing_fee?.analysis_code_to_assing !== undefined
              ? feeSetup.invoicing_fee.analysis_code_to_assing
              : existingInvoicing.analysis_code_to_assing || ''
        }
      }
    };

    // If notice_plan_number missing, backfill it
    let noticePlanNumber = noticeSetup.notice_plan_number;
    if (!noticePlanNumber) {
      noticePlanNumber = await generateNextNoticePlanNumber();
    }

    const collection = mongoose.connection.db.collection(NoticeSetup.collection.name);
    const updateResult = await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { notice_charges: updatedNoticeCharges, notice_plan_number: noticePlanNumber } }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notice setup not found'
      });
    }

    const updatedNoticeSetup = await NoticeSetup.findById(req.params.id).lean();

    res.status(200).json({
      success: true,
      message: 'Notice charges updated successfully',
      data: updatedNoticeSetup
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
      message: 'Error updating notice charges',
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

