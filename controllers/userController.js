import mongoose from "mongoose";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import Invoice from "../models/Invoice.js";
import Unit from "../models/Unit.js";
import { getFileUrl } from "../middleware/uploadMiddleware.js";
import { calculateInvoiceStats } from "../utils/invoiceHelpers.js";
import getStripe from "../config/stripe.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to create default invoices for a user (exported for use in other functions)
export const createDefaultInvoicesForUser = async (user) => {
  try {
    // Check if user already has invoices
    const existingInvoices = await Invoice.countDocuments({ customer_id: user._id });
    if (existingInvoices > 0) {
      return { created: 0, message: 'User already has invoices' };
    }

    const now = new Date();
    const invoices = [];

    // Create 5 default invoices with different statuses
    const defaultInvoices = [
      {
        customer_id: user._id,
        customer_name: user.name || 'Customer',
        customer_email: user.email || '',
        unit_number: ['UNIT-001'],
        amount: 100.00,
        issue_date: new Date(now.getFullYear(), now.getMonth(), 1), // First day of current month
        due_date: new Date(now.getFullYear(), now.getMonth() + 1, 1), // First day of next month
        status: 'pending',
        invoice_title: 'Monthly Storage Fee'
      },
      {
        customer_id: user._id,
        customer_name: user.name || 'Customer',
        customer_email: user.email || '',
        unit_number: ['UNIT-002'],
        amount: 150.00,
        issue_date: new Date(now.getFullYear(), now.getMonth() - 1, 15), // 15th of last month
        due_date: new Date(now.getFullYear(), now.getMonth(), 15), // 15th of current month
        status: 'paid',
        invoice_title: 'Previous Month Storage Fee'
      },
      {
        customer_id: user._id,
        customer_name: user.name || 'Customer',
        customer_email: user.email || '',
        unit_number: ['UNIT-003'],
        amount: 75.00,
        issue_date: new Date(now.getFullYear(), now.getMonth() - 2, 1), // 2 months ago
        due_date: new Date(now.getFullYear(), now.getMonth() - 1, 1), // 1 month ago
        status: 'overdue',
        invoice_title: 'Past Due Storage Fee'
      },
      {
        customer_id: user._id,
        customer_name: user.name || 'Customer',
        customer_email: user.email || '',
        unit_number: ['UNIT-001'],
        amount: 200.00,
        issue_date: new Date(now.getFullYear(), now.getMonth() - 1, 1), // First day of last month
        due_date: new Date(now.getFullYear(), now.getMonth(), 5), // 5th of current month
        status: 'paid',
        invoice_title: 'Storage Unit Rental'
      },
      {
        customer_id: user._id,
        customer_name: user.name || 'Customer',
        customer_email: user.email || '',
        unit_number: ['UNIT-001', 'UNIT-002'],
        amount: 125.00,
        issue_date: new Date(now.getFullYear(), now.getMonth(), 10), // 10th of current month
        due_date: new Date(now.getFullYear(), now.getMonth() + 1, 10), // 10th of next month
        status: 'pending',
        invoice_title: 'Additional Storage Services'
      }
    ];

    // Create invoices
    for (const invoiceData of defaultInvoices) {
      const invoice = new Invoice(invoiceData);
      await invoice.save();
      invoices.push(invoice);
    }

    return { created: invoices.length, invoices };
  } catch (error) {
    console.error(`Error creating default invoices for user ${user._id}:`, error);
    throw error;
  }
};

// Create a new user
export const createUser = async (req, res) => {
  const currentUser = req.user;
  const userRoles = currentUser?.roles || [];
  const isAdmin = userRoles.includes('admin') || userRoles.includes('moderator');

  // Only admins can create users
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Administrator privileges are required to create users.",
      code: "AUTH_FORBIDDEN"
    });
  }

  try {
    const { name, email, phoneNumber, password, roles } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      phoneNumber,
      password,
      roles: roles || ["user"],
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error creating user",
      error: error.message,
    });
  }
};

// Create a new user and assign a unit to them
export const createUserWithUnit = async (req, res) => {
  const currentUser = req.user;
  const userRoles = currentUser?.roles || [];
  const isAdmin = userRoles.includes('admin') || userRoles.includes('moderator');

  // Only admins can create users
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Administrator privileges are required to create users.",
      code: "AUTH_FORBIDDEN"
    });
  }

  try {
    const { 
      name, 
      email, 
      phoneNumber, 
      password, 
      roles, 
      unitId, 
      billing_cycle, 
      deposit_amount, 
      start_date, 
      end_date,
      secondaryContactName,
      secondaryPhoneNumber,
      secondaryEmail,
      language,
      other
    } = req.body;

    // Validate required fields
    if (!name || !email || !phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phoneNumber, and password are required",
      });
    }

    if (!unitId) {
      return res.status(400).json({
        success: false,
        message: "unitId is required to assign a unit to the user",
      });
    }

    // Validate unitId format
    if (!mongoose.Types.ObjectId.isValid(unitId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid unitId format",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Check if unit exists
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    // Check if unit is already rented to someone else
    if (unit.unit_is === 'rented' && unit.customer_email) {
      return res.status(400).json({
        success: false,
        message: `Unit is already rented to another customer (${unit.customer_email})`,
      });
    }

    // Handle file uploads (id_document, contract_copy, additional_records)
    const files = req.files || {};
    const idDocumentFile = files.id_document && files.id_document[0] ? getFileUrl(files.id_document[0].filename) : "";
    const contractCopyFile = files.contract_copy && files.contract_copy[0] ? getFileUrl(files.contract_copy[0].filename) : "";
    const additionalRecordsFile = files.additional_records && files.additional_records[0] ? getFileUrl(files.additional_records[0].filename) : "";

    // Create new user with all fields
    const user = new User({
      name,
      email,
      phoneNumber,
      password,
      roles: roles || ["user"],
      secondaryContactName: secondaryContactName || "",
      secondaryPhoneNumber: secondaryPhoneNumber || "",
      secondaryEmail: secondaryEmail || "",
      language: language || "",
      other: other || "",
      id_document: idDocumentFile,
      contract_copy: contractCopyFile,
      additional_records: additionalRecordsFile,
    });

    await user.save();

    // Assign unit to the newly created user
    unit.customer_email = user.email.toLowerCase().trim();
    unit.unit_is = 'rented';
    await unit.save();

    // Add unit to user's rented_units array
    const rentedUnitData = {
      unit_id: unit._id,
      unit_number: unit.unit_number,
      location: unit.location,
      location_two: unit.location_two,
      description: unit.description,
      unit_details: unit.unit_details || {},
      dimensions: unit.dimensions || {},
      unit_is: 'rented',
      customer_email: user.email.toLowerCase().trim(),
      monthly_rate: unit.monthly_rate || 0,
      other_information: unit.other_information || {},
      maintenance_comments: unit.maintenance_comments,
      billing_cycle: billing_cycle || '',
      deposit_amount: deposit_amount || 0,
      start_date: start_date ? new Date(start_date) : new Date(), // Default to current date if not provided
      end_date: end_date ? new Date(end_date) : null
    };

    // Initialize rented_units array if it doesn't exist
    if (!user.rented_units) {
      user.rented_units = [];
    }

    // Add the unit to rented_units array
    user.rented_units.push(rentedUnitData);
    await user.save();

    // Fetch updated user with populated rented_units
    const updatedUser = await User.findById(user._id).populate('rented_units.unit_id');

    // Fetch updated unit with customer info
    const updatedUnit = await Unit.findById(unitId);

    res.status(201).json({
      success: true,
      message: "User created successfully and unit assigned",
      data: {
        user: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber,
          roles: updatedUser.roles,
          secondaryContactName: updatedUser.secondaryContactName,
          secondaryPhoneNumber: updatedUser.secondaryPhoneNumber,
          secondaryEmail: updatedUser.secondaryEmail,
          language: updatedUser.language,
          other: updatedUser.other,
          id_document: updatedUser.id_document || null,
          contract_copy: updatedUser.contract_copy || null,
          additional_records: updatedUser.additional_records || null,
          rented_units: updatedUser.rented_units,
          createdAt: updatedUser.createdAt
        },
        unit: updatedUnit
      },
    });
  } catch (error) {
    // If user was created but unit assignment failed, we should handle it
    // For now, we'll just return the error
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating user with unit assignment",
      error: error.message,
    });
  }
};

// Get all users with pagination
export const getAllUsers = async (req, res) => {
  const { name } = req.query;
  const currentUser = req.user;
  const userRoles = currentUser?.roles || [];
  const isAdmin = userRoles.includes('admin') || userRoles.includes('moderator');

  // Only admins can view all users
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Administrator privileges are required to view all users.",
      code: "AUTH_FORBIDDEN"
    });
  }

  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter = {};
    if (name && name.trim() !== "") {
      // Case-insensitive name search (matches partial names)
      filter.$or = [
        { name: { $regex: name.trim(), $options: "i" } },
        { first_name: { $regex: name.trim(), $options: "i" } },
        { last_name: { $regex: name.trim(), $options: "i" } },
      ];
    }

    // Get total count for pagination metadata (with filter applied)
    const totalUsers = await User.countDocuments(filter);

    // Get paginated users (with filter applied)
    const users = await User.find(filter)
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sort by newest first

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalUsers / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null,
      },
      data: users,
      filter: name ? { name: name.trim() } : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};

// Search customers by name (for dropdown/autocomplete)
export const searchCustomers = async (req, res) => {
  try {
    const { q, limit: limitParam } = req.query;
    
    // Validate search query
    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required. Please provide a name to search.',
      });
    }

    const searchTerm = q.trim();
    const limit = parseInt(limitParam, 10) || 20; // Default 20 results for dropdown
    
    // Build search filter - case-insensitive partial match
    const filter = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { first_name: { $regex: searchTerm, $options: 'i' } },
        { last_name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    };

    // Search users and return minimal data for dropdown
    const customers = await User.find(filter)
      .select('_id name first_name last_name email phoneNumber')
      .limit(limit)
      .sort({ name: 1 }); // Sort alphabetically by name

    res.status(200).json({
      success: true,
      count: customers.length,
      query: searchTerm,
      data: customers.map(customer => ({
        _id: customer._id,
        name: customer.name,
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
        displayName: customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching customers',
      error: error.message
    });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUser = req.user;
    const userRoles = currentUser?.roles || [];
    const isAdmin = userRoles.includes('admin') || userRoles.includes('moderator');
    const isViewingSelf = userId === currentUser._id.toString();

    // Authorization check: Users can only view themselves, admins can view anyone
    if (!isViewingSelf && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own profile. Administrators can view any user.",
        code: "AUTH_FORBIDDEN"
      });
    }

    const user = await User.findById(userId)
      .select("-password")
      .populate('rented_units.unit_id');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has actual rented units from Unit collection
    const userEmail = user.email.toLowerCase().trim();
    const actualRentedUnitsCount = await Unit.countDocuments({
      customer_email: userEmail,
      unit_is: 'rented'
    });

    // Also check user's rented_units array for actual unit references (not dummy/sample)
    const actualRentedUnitsInArray = user.rented_units?.filter(
      ru => ru.unit_id && !ru.unit_id.sample
    ).length || 0;

    // Check if user has ANY actual rented units
    let hasActualRentedUnits = actualRentedUnitsCount > 0 || actualRentedUnitsInArray > 0;

    // Fetch transactions related to this user (both move_out and actual move_out)
    let transactions = await Transaction.find({
      $or: [
        { 'move_out_notice_give.customer_id': user._id },
        { 'actual_move_out_notice.customer_id': user._id }
      ]
    }).sort({ createdAt: -1 });

    // If no transactions exist, return sample (non-persisted) data for frontend integration
    if (!transactions || transactions.length === 0) {
      const now = new Date();
      const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      transactions = [
        {
          _id: '64f1f77bcf86cd7994390001',
          status: 'pending',
          move_out_notice_give: {
            date: now.toISOString(),
            balance_owning: 1043,
            other_charges: 'Cleaning fee',
            customer_id: user._id
          },
          actual_move_out_notice: {
            date: inThreeDays.toISOString(),
            reverse_deposit: 500,
            final_amount_owed: 543,
            customer_id: user._id
          },
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          sample: true
        }
      ];
    }

    const userObject = user.toJSON();
    userObject.transactions = transactions || [];

    // Ensure subscriptions is at least an empty array
    if (!Array.isArray(userObject.subscriptions)) {
      userObject.subscriptions = [];
    }

    // If no subscriptions exist, add sample (non-persisted) subscriptions for frontend integration
    if (!userObject.subscriptions || userObject.subscriptions.length === 0) {
      userObject.subscriptions = [
        {
          _id: '64f1f77bcf86cd7994391001',
          type: '6 × 8 - 2.8 DH',
          quantity: 2,
          status: 'active',
          frequency: 'monthly',
          next_invoice_date: '2025-10-01T00:00:00.000Z',
          next_invoice_amount: 33000,
          sample: true
        },
        {
          _id: '64f1f77bcf86cd7994391002',
          type: '6 × 8 - 2.8 DH',
          quantity: 1,
          status: 'cancelled',
          frequency: 'monthly',
          next_invoice_date: null,
          next_invoice_amount: 0,
          sample: true
        }
      ];
    }

    // Filter out any dummy/sample units if user has actual rented units
    if (hasActualRentedUnits && userObject.rented_units && userObject.rented_units.length > 0) {
      userObject.rented_units = userObject.rented_units.filter(
        ru => ru.unit_id && !ru.unit_id.sample
      );
    }

    // If user has no rented units, return empty array (no default units)
    if (!hasActualRentedUnits && (!userObject.rented_units || userObject.rented_units.length === 0)) {
      userObject.rented_units = [];
    }

    res.status(200).json({
      success: true,
      data: userObject,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUser = req.user; // From tokenMiddleware
    const userRoles = currentUser?.roles || [];
    const isAdmin = userRoles.includes('admin') || userRoles.includes('moderator');
    const isUpdatingSelf = userId === currentUser._id.toString();

    // Authorization check: Users can only update themselves, admins can update anyone
    if (!isUpdatingSelf && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own profile. Administrators can update any user.",
        code: "AUTH_FORBIDDEN"
      });
    }

    const {
      name,
      first_name,
      last_name,
      email,
      phoneNumber,
      address_line_one,
      address_line_two,
      city,
      state_province,
      zip_code,
      password,
      roles,
      secondaryContactName,
      secondaryPhoneNumber,
      secondaryEmail,
      language,
      other,
    } = req.body;
    const updateData = {};

    // Only include fields that are provided
    if (name !== undefined) updateData.name = name;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (address_line_one !== undefined) updateData.address_line_one = address_line_one;
    if (address_line_two !== undefined) updateData.address_line_two = address_line_two;
    if (city !== undefined) updateData.city = city;
    if (state_province !== undefined) updateData.state_province = state_province;
    if (zip_code !== undefined) updateData.zip_code = zip_code;
    if (password !== undefined) updateData.password = password;
    
    // Only admins can update roles
    if (roles !== undefined) {
      if (isAdmin) {
        updateData.roles = roles;
      } else {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to update user roles.",
          code: "AUTH_FORBIDDEN"
        });
      }
    }
    
    if (secondaryContactName !== undefined) updateData.secondaryContactName = secondaryContactName;
    if (secondaryPhoneNumber !== undefined) updateData.secondaryPhoneNumber = secondaryPhoneNumber;
    if (secondaryEmail !== undefined) updateData.secondaryEmail = secondaryEmail;
    if (language !== undefined) updateData.language = language;
    if (other !== undefined) updateData.other = other;

    // Handle file uploads for documents
    if (req.files) {
      // Get current user to delete old files if new ones are uploaded
      const currentUser = await User.findById(req.params.id);
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'documents');
      
      if (req.files.id_document && req.files.id_document[0]) {
        // Delete old file if exists
        if (currentUser?.id_document) {
          try {
            const oldFileName = path.basename(currentUser.id_document);
            const oldFilePath = path.join(uploadsDir, oldFileName);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
              console.log(`[update-user] Deleted old id_document: ${oldFileName}`);
            }
          } catch (error) {
            console.error(`[update-user] Error deleting old id_document:`, error.message);
          }
        }
        // Store file URL
        updateData.id_document = getFileUrl(req.files.id_document[0].filename);
        console.log(`[update-user] Uploaded id_document: ${req.files.id_document[0].filename}`);
      }

      if (req.files.contract_copy && req.files.contract_copy[0]) {
        // Delete old file if exists
        if (currentUser?.contract_copy) {
          try {
            const oldFileName = path.basename(currentUser.contract_copy);
            const oldFilePath = path.join(uploadsDir, oldFileName);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
              console.log(`[update-user] Deleted old contract_copy: ${oldFileName}`);
            }
          } catch (error) {
            console.error(`[update-user] Error deleting old contract_copy:`, error.message);
          }
        }
        // Store file URL
        updateData.contract_copy = getFileUrl(req.files.contract_copy[0].filename);
        console.log(`[update-user] Uploaded contract_copy: ${req.files.contract_copy[0].filename}`);
      }

      if (req.files.additional_records && req.files.additional_records[0]) {
        // Delete old file if exists
        if (currentUser?.additional_records) {
          try {
            const oldFileName = path.basename(currentUser.additional_records);
            const oldFilePath = path.join(uploadsDir, oldFileName);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
              console.log(`[update-user] Deleted old additional_records: ${oldFileName}`);
            }
          } catch (error) {
            console.error(`[update-user] Error deleting old additional_records:`, error.message);
          }
        }
        // Store file URL
        updateData.additional_records = getFileUrl(req.files.additional_records[0].filename);
        console.log(`[update-user] Uploaded additional_records: ${req.files.additional_records[0].filename}`);
      }
    }

    // Also allow updating document URLs directly (if frontend uploads separately)
    if (req.body.id_document && typeof req.body.id_document === 'string') {
      updateData.id_document = req.body.id_document;
    }
    if (req.body.contract_copy && typeof req.body.contract_copy === 'string') {
      updateData.contract_copy = req.body.contract_copy;
    }
    if (req.body.additional_records && typeof req.body.additional_records === 'string') {
      updateData.additional_records = req.body.additional_records;
    }
    // Check if email is being updated and if it's already taken
    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.params.id },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email is already taken by another user.",
        });
      }
    }

    // Get user before update to track changes (for admin notification)
    const userBeforeUpdate = await User.findById(req.params.id).select("-password");
    
    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Send notification to admins about important user updates (only if admin made the update)
    if (isAdmin && !isUpdatingSelf && userBeforeUpdate) {
      try {
        // Track important field changes
        const importantFields = ['email', 'phoneNumber', 'roles', 'name'];
        const changedFields = importantFields.filter(field => {
          if (field === 'roles') {
            // Compare arrays
            const oldRoles = JSON.stringify((userBeforeUpdate.roles || []).sort());
            const newRoles = JSON.stringify((user.roles || []).sort());
            return oldRoles !== newRoles;
          }
          return userBeforeUpdate[field] !== user[field];
        });

        if (changedFields.length > 0) {
          const { emitNotificationToAdmin } = await import('../utils/socketService.js');
          await emitNotificationToAdmin({
            type: 'user_updated',
            title: 'User Account Updated',
            message: `User ${user.name || user.email} account updated. Changed: ${changedFields.join(', ')}`,
            priority: 'medium',
            data: {
              user_id: user._id.toString(),
              user_name: user.name,
              user_email: user.email,
              changed_fields: changedFields,
              updated_by: currentUser.name || currentUser.email,
              updated_at: new Date().toISOString(),
              changes: changedFields.reduce((acc, field) => {
                acc[field] = {
                  old: userBeforeUpdate[field],
                  new: user[field]
                };
                return acc;
              }, {})
            }
          });
          console.log(`📢 Admin notification sent for user update: ${user.email}`);
        }
      } catch (adminNotificationError) {
        console.error(`❌ Failed to send admin notification for user update:`, adminNotificationError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: user,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error updating user",
      error: error.message,
    });
  }
};

// Get units rented by a user
export const getUserRentedUnits = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUser = req.user;
    const userRoles = currentUser?.roles || [];
    const isAdmin = userRoles.includes('admin') || userRoles.includes('moderator');
    const isViewingSelf = userId === currentUser._id.toString();

    // Pagination parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Authorization check: Users can only view their own rented units, admins can view any user's
    if (!isViewingSelf && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own rented units. Administrators can view any user's rented units.",
        code: "AUTH_FORBIDDEN"
      });
    }

    const user = await User.findById(userId)
      .select('rented_units email')
      .populate('rented_units.unit_id');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Filter out any dummy/sample units
    const allRentedUnits = (user.rented_units || []).filter(
      ru => ru.unit_id && !ru.unit_id.sample
    );

    // If no rented units exist, return empty array (no default units created)

    // Apply pagination
    const paginatedRentedUnits = allRentedUnits.slice(skip, skip + limit);
    
    // Calculate summary statistics from ALL units (not just paginated)
    const totalUnits = allRentedUnits.length;
    
    // Calculate total monthly cost from all rented units
    const monthlyCostTotal = allRentedUnits.reduce((sum, rentedUnit) => {
      const monthlyRate = rentedUnit.monthly_rate || 
                         (rentedUnit.unit_id && rentedUnit.unit_id.monthly_rate) || 
                         0;
      return sum + (typeof monthlyRate === 'number' ? monthlyRate : parseFloat(monthlyRate) || 0);
    }, 0);
    
    const totalSpace = allRentedUnits.reduce((sum, rentedUnit) => {
      const areaSize = rentedUnit.dimensions?.area_size || 
                      (rentedUnit.unit_id && rentedUnit.unit_id.dimensions?.area_size);
      if (areaSize) {
        const match = String(areaSize).match(/(\d+\.?\d*)/);
        if (match) {
          const value = parseFloat(match[1]);
          if (!isNaN(value)) {
            return sum + value;
          }
        }
      }
      return sum;
    }, 0);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalUnits / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      message: "User rented units retrieved successfully",
      data: {
        rented_units: paginatedRentedUnits,
        total: totalUnits,
        total_units: totalUnits,
        monthly_cost_total: monthlyCostTotal,
        total_space: parseFloat(totalSpace.toFixed(2)),
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalUnits,
          limit,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null
        }
      }
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error fetching user rented units",
      error: error.message,
    });
  }
};

// Update user's rented units
export const updateUserRentedUnits = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if rented_units is provided
    if (!req.body.rented_units) {
      return res.status(400).json({
        success: false,
        message: "rented_units field is required",
      });
    }

    // Validate that rented_units is an array
    if (!Array.isArray(req.body.rented_units)) {
      return res.status(400).json({
        success: false,
        message: "rented_units must be an array",
      });
    }

    // Validate each rented unit object
    const validKeys = ['unit_id', 'billing_cycle', 'deposit_amount', 'start_date', 'end_date'];
    for (let i = 0; i < req.body.rented_units.length; i++) {
      const rentedUnit = req.body.rented_units[i];
      const providedKeys = Object.keys(rentedUnit);
      const invalidKeys = providedKeys.filter(key => !validKeys.includes(key));

      if (invalidKeys.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid keys in rented_units[${i}]: ${invalidKeys.join(', ')}. Only 'unit_id', 'billing_cycle', 'deposit_amount', 'start_date', and 'end_date' are allowed.`
        });
      }

      // Validate required fields
      if (!rentedUnit.unit_id) {
        return res.status(400).json({
          success: false,
          message: `unit_id is required in rented_units[${i}]`
        });
      }

      // Convert dates if provided as strings
      if (rentedUnit.start_date && typeof rentedUnit.start_date === 'string') {
        rentedUnit.start_date = new Date(rentedUnit.start_date);
      }
      if (rentedUnit.end_date && typeof rentedUnit.end_date === 'string') {
        rentedUnit.end_date = new Date(rentedUnit.end_date);
      }

      // Validate deposit_amount is a number
      if (rentedUnit.deposit_amount !== undefined && isNaN(rentedUnit.deposit_amount)) {
        return res.status(400).json({
          success: false,
          message: `deposit_amount must be a number in rented_units[${i}]`
        });
      }
    }

    // Check for any other keys outside rented_units
    const bodyKeys = Object.keys(req.body);
    const otherKeys = bodyKeys.filter(key => key !== 'rented_units');
    if (otherKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Only 'rented_units' field is allowed. Found additional keys: ${otherKeys.join(', ')}`
      });
    }

    // Get existing rented units
    const existingRentedUnits = user.rented_units || [];

    // Process new units: add new ones or update existing ones with same unit_id
    for (const newUnit of req.body.rented_units) {
      // Convert dates if provided as strings
      const processedUnit = { ...newUnit };
      if (processedUnit.start_date && typeof processedUnit.start_date === 'string') {
        processedUnit.start_date = new Date(processedUnit.start_date);
      }
      if (processedUnit.end_date && typeof processedUnit.end_date === 'string') {
        processedUnit.end_date = processedUnit.end_date ? new Date(processedUnit.end_date) : null;
      }

      // Check if unit with this unit_id already exists
      const existingUnitIndex = existingRentedUnits.findIndex(
        unit => unit.unit_id && unit.unit_id.toString() === processedUnit.unit_id.toString()
      );

      if (existingUnitIndex !== -1) {
        // Update existing unit
        existingRentedUnits[existingUnitIndex] = {
          ...existingRentedUnits[existingUnitIndex].toObject(),
          ...processedUnit
        };
      } else {
        // Add new unit
        existingRentedUnits.push(processedUnit);
      }
    }

    // Update the user's rented_units with merged array
    user.rented_units = existingRentedUnits;
    await user.save();

    // Populate unit details for response
    await user.populate('rented_units.unit_id');

    res.status(200).json({
      success: true,
      message: "User rented units updated successfully",
      data: user,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or unit ID",
      });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error updating user rented units",
      error: error.message,
    });
  }
};

// Update a specific rented unit for a user
export const updateUserRentedUnit = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get old_unit_id from URL parameter
    const oldUnitId = req.params.unitId;

    // Validate request body structure
    const validKeys = ['unit_id', 'billing_cycle', 'deposit_amount', 'start_date', 'end_date'];
    const providedKeys = Object.keys(req.body);
    const invalidKeys = providedKeys.filter(key => !validKeys.includes(key));

    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid keys: ${invalidKeys.join(', ')}. Only 'unit_id', 'billing_cycle', 'deposit_amount', 'start_date', and 'end_date' are allowed.`
      });
    }

    // Validate required fields
    if (!req.body.unit_id) {
      return res.status(400).json({
        success: false,
        message: "unit_id is required"
      });
    }

    // Convert dates if provided as strings
    const updateData = { ...req.body };
    if (updateData.start_date && typeof updateData.start_date === 'string') {
      updateData.start_date = new Date(updateData.start_date);
    }
    if (updateData.end_date && typeof updateData.end_date === 'string') {
      updateData.end_date = updateData.end_date ? new Date(updateData.end_date) : null;
    }

    // Validate deposit_amount is a number
    if (updateData.deposit_amount !== undefined && isNaN(updateData.deposit_amount)) {
      return res.status(400).json({
        success: false,
        message: "deposit_amount must be a number"
      });
    }

    // Find the unit to update in rented_units array
    const unitIndex = user.rented_units.findIndex(
      unit => unit.unit_id && unit.unit_id.toString() === oldUnitId
    );

    if (unitIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Rented unit with unit_id ${oldUnitId} not found for this user`,
      });
    }

    // Update the specific unit (merge with existing data)
    user.rented_units[unitIndex] = {
      ...user.rented_units[unitIndex].toObject(),
      ...updateData
    };

    await user.save();

    // Populate unit details for response
    await user.populate('rented_units.unit_id');

    res.status(200).json({
      success: true,
      message: "User rented unit updated successfully",
      data: user,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or unit ID",
      });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error updating user rented unit",
      error: error.message,
    });
  }
};

// Remove a specific rented unit from user
export const removeUserRentedUnit = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get unit_id from URL parameter
    const unitIdToRemove = req.params.unitId;

    // Find the unit index in rented_units array
    const unitIndex = user.rented_units.findIndex(
      unit => unit.unit_id && unit.unit_id.toString() === unitIdToRemove
    );

    if (unitIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Rented unit with unit_id ${unitIdToRemove} not found for this user`,
      });
    }

    // Remove the unit from the array
    user.rented_units.splice(unitIndex, 1);
    await user.save();

    // Populate remaining unit details for response
    await user.populate('rented_units.unit_id');

    res.status(200).json({
      success: true,
      message: "Rented unit removed successfully",
      data: user,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or unit ID",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error removing rented unit",
      error: error.message,
    });
  }
};

// Update user's charges
export const updateUserCharges = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if charges is provided
    if (!req.body.charges) {
      return res.status(400).json({
        success: false,
        message: "charges field is required",
      });
    }

    // Validate that charges is an object
    if (typeof req.body.charges !== 'object' || Array.isArray(req.body.charges)) {
      return res.status(400).json({
        success: false,
        message: "charges must be an object",
      });
    }

    // Validate charge object keys
    const validKeys = ['date', 'analysis_code', 'quantity', 'description', 'charge_amount', 'invoice_narration', 'from', 'to', 'print_this_info_on_invoice'];
    const providedKeys = Object.keys(req.body.charges);
    const invalidKeys = providedKeys.filter(key => !validKeys.includes(key));

    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid keys in charges: ${invalidKeys.join(', ')}. Only 'date', 'analysis_code', 'quantity', 'description', 'charge_amount', 'invoice_narration', 'from', 'to', and 'print_this_info_on_invoice' are allowed.`
      });
    }

    // Process charge object
    const processedCharge = { ...req.body.charges };
    
    // Convert dates if provided as strings
    if (processedCharge.date && typeof processedCharge.date === 'string') {
      processedCharge.date = new Date(processedCharge.date);
    } else if (processedCharge.date === null || processedCharge.date === '') {
      processedCharge.date = null;
    }
    
    if (processedCharge.from && typeof processedCharge.from === 'string') {
      processedCharge.from = new Date(processedCharge.from);
    } else if (processedCharge.from === null || processedCharge.from === '') {
      processedCharge.from = null;
    }
    
    if (processedCharge.to && typeof processedCharge.to === 'string') {
      processedCharge.to = new Date(processedCharge.to);
    } else if (processedCharge.to === null || processedCharge.to === '') {
      processedCharge.to = null;
    }

    // Validate numeric fields
    if (processedCharge.quantity !== undefined && isNaN(processedCharge.quantity)) {
      return res.status(400).json({
        success: false,
        message: "quantity must be a number"
      });
    }
    if (processedCharge.charge_amount !== undefined && isNaN(processedCharge.charge_amount)) {
      return res.status(400).json({
        success: false,
        message: "charge_amount must be a number"
      });
    }

    // Validate boolean field
    if (processedCharge.print_this_info_on_invoice !== undefined && typeof processedCharge.print_this_info_on_invoice !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "print_this_info_on_invoice must be a boolean"
      });
    }

    // Check for any other keys outside charges
    const bodyKeys = Object.keys(req.body);
    const otherKeys = bodyKeys.filter(key => key !== 'charges');
    if (otherKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Only 'charges' field is allowed. Found additional keys: ${otherKeys.join(', ')}`
      });
    }

    // Update the user's charges with the new object
    user.charges = processedCharge;
    await user.save();

    // Populate analysis_code for response
    await user.populate('charges.analysis_code');

    res.status(200).json({
      success: true,
      message: "User charges updated successfully",
      data: user,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or analysis code ID",
      });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error updating user charges",
      error: error.message,
    });
  }
};

// Undo (clear) user's charges
export const undoUserCharges = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if charges exist
    if (!user.charges || user.charges === null) {
      return res.status(400).json({
        success: false,
        message: "No charges to undo. Charges field is already empty.",
      });
    }

    // Clear the charges by setting to null
    user.charges = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "User charges undone successfully (charges cleared)",
      data: user,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error undoing user charges",
      error: error.message,
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  const userId = req.params.id;
  const currentUser = req.user;
  const userRoles = currentUser?.roles || [];
  const isAdmin = userRoles.includes('admin') || userRoles.includes('moderator');

  // Only admins can delete users
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Administrator privileges are required to delete users.",
      code: "AUTH_FORBIDDEN"
    });
  }

  try {
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: {},
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error.message,
    });
  }
};

// Get invoices by user ID
export const getUserInvoicesById = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUser = req.user;
    const userRoles = currentUser?.roles || [];
    const isAdmin = userRoles.includes('admin') || userRoles.includes('moderator');
    const isViewingSelf = userId === currentUser._id.toString();

    // Authorization check: Users can only view their own invoices, admins can view anyone's
    if (!isViewingSelf && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own invoices. Administrators can view any user's invoices.",
        code: "AUTH_FORBIDDEN"
      });
    }

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Pagination parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Build query with optional filters
    const query = { customer_id: userId };
    
    // Filter by status if provided
    if (req.query.status && req.query.status.trim() !== '') {
      query.status = req.query.status.trim().toLowerCase();
    }

    // Filter by date
    // Supports: date_from, date_to (for date range) or date (single date)
    // Priority: date_from/date_to > date (if both provided, date_from/date_to takes precedence)
    const hasDateRange = (req.query.date_from && req.query.date_from.trim() !== '') || 
                         (req.query.date_to && req.query.date_to.trim() !== '');
    
    if (hasDateRange) {
      // Date range filter (filters by issue_date)
      if (req.query.date_from && req.query.date_from.trim() !== '') {
        const fromDate = new Date(req.query.date_from.trim());
        if (!isNaN(fromDate.getTime())) {
          query.issue_date = query.issue_date || {};
          query.issue_date.$gte = fromDate;
        }
      }

      if (req.query.date_to && req.query.date_to.trim() !== '') {
        const toDate = new Date(req.query.date_to.trim());
        toDate.setHours(23, 59, 59, 999); // End of day
        if (!isNaN(toDate.getTime())) {
          query.issue_date = query.issue_date || {};
          query.issue_date.$lte = toDate;
        }
      }
    } else if (req.query.date && req.query.date.trim() !== '') {
      // Single date filter (matches either issue_date or due_date)
      const singleDate = new Date(req.query.date.trim());
      if (!isNaN(singleDate.getTime())) {
        const startOfDay = new Date(singleDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(singleDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Match invoices where issue_date or due_date falls on this date
        query.$or = [
          { issue_date: { $gte: startOfDay, $lte: endOfDay } },
          { due_date: { $gte: startOfDay, $lte: endOfDay } }
        ];
      }
    }

    // Get total count and invoices (after potentially creating defaults)
    const [totalCount, allInvoices] = await Promise.all([
      Invoice.countDocuments(query),
      Invoice.find(query).sort({ createdAt: -1 })
    ]);

    // Apply pagination to the invoices
    const paginatedInvoices = allInvoices.slice(skip, skip + limit);
    const finalTotalCount = totalCount;

    // Calculate invoice statistics using helper function
    const invoiceStats = await calculateInvoiceStats(userId);

    // Add payment links to paginated invoices
    const invoicesWithPaymentLinks = await Promise.all(
      paginatedInvoices.map(async (invoice) => {
        const invoiceObj = invoice.toObject();
        // Get payment link if invoice is pending
        if (invoice.status === 'pending' && invoice.amount > 0) {
          try {
            const stripe = getStripe();
            if (invoice.stripe_checkout_session_id) {
              try {
                const session = await stripe.checkout.sessions.retrieve(
                  invoice.stripe_checkout_session_id
                );
                if (session.status === 'open') {
                  invoiceObj.payment_link = session.url;
                } else {
                  invoiceObj.payment_link = null;
                }
              } catch (error) {
                invoiceObj.payment_link = null;
              }
            } else {
              invoiceObj.payment_link = null;
            }
          } catch (error) {
            invoiceObj.payment_link = null;
          }
        } else {
          invoiceObj.payment_link = null;
        }
        return invoiceObj;
      })
    );

    // Calculate pagination metadata
    const totalPages = Math.ceil(finalTotalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      count: invoicesWithPaymentLinks.length,
      total_invoices: invoiceStats.total_invoices,
      paid_invoices: invoiceStats.paid_invoices,
      unpaid_invoices: invoiceStats.unpaid_invoices,
      overdue_invoices: invoiceStats.overdue_invoices,
      monthly_invoice_summary: invoiceStats.monthly_invoice_summary,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: finalTotalCount,
        limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null,
      },
      data: invoicesWithPaymentLinks,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error fetching user invoices",
      error: error.message,
    });
  }
};

// Add default invoices for a specific user
export const addDefaultInvoicesForUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUser = req.user;
    const userRoles = currentUser?.roles || [];
    const isAdmin = userRoles.includes('admin') || userRoles.includes('moderator');

    // Only admins can add default invoices
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Administrator privileges are required to add default invoices.",
        code: "AUTH_FORBIDDEN"
      });
    }

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const result = await createDefaultInvoicesForUser(user);

    res.status(200).json({
      success: true,
      message: result.created > 0 
        ? `Successfully created ${result.created} default invoices for user`
        : result.message,
      data: {
        invoicesCreated: result.created,
        invoices: result.invoices || []
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating default invoices",
      error: error.message,
    });
  }
};

// Get user billing information (Balance Due, Next Bill Date, Next Bill Amount)
export const getUserBillingInfo = async (req, res) => {
  try {
    const userId = req.params.id;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // Check if user exists
    const user = await User.findById(userId).populate('rented_units.unit_id');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 1. Calculate Balance Due
    // Get all unpaid invoices (pending + overdue status)
    const unpaidInvoices = await Invoice.find({
      customer_id: userId,
      status: { $in: ['pending', 'overdue'] }
    });

    const balanceDue = unpaidInvoices.reduce((sum, invoice) => {
      return sum + (invoice.amount || 0);
    }, 0);

    // 2. Calculate Next Bill Date and Next Bill Amount
    // Get user's rented units to find billing cycle and monthly rates
    const rentedUnits = user.rented_units || [];
    
    let nextBillDate = null;
    let nextBillAmount = 0;

    // Find the earliest billing cycle date from rented units
    const now = new Date();
    const billingDates = [];

    for (const rentedUnit of rentedUnits) {
      // Get monthly rate (from rented_units or populated unit_id)
      const monthlyRate = rentedUnit.monthly_rate || 
                         (rentedUnit.unit_id && rentedUnit.unit_id.monthly_rate) || 
                         0;
      
      if (monthlyRate > 0) {
        nextBillAmount += monthlyRate;

        // Calculate next bill date based on start_date and billing_cycle
        const startDate = rentedUnit.start_date;
        if (startDate) {
          const start = new Date(startDate);
          
          // Get billing cycle day (default to day of month from start_date)
          // If billing_cycle is specified and contains a number, use that
          let billingDay = start.getDate();
          if (rentedUnit.billing_cycle) {
            // Try to extract day from billing_cycle (e.g., "15th", "15", "monthly-15")
            const dayMatch = rentedUnit.billing_cycle.match(/(\d{1,2})/);
            if (dayMatch) {
              billingDay = parseInt(dayMatch[1], 10);
            }
          }

          // Calculate next billing date
          let nextBill = new Date(now.getFullYear(), now.getMonth(), billingDay);
          
          // If the billing day has passed this month, move to next month
          if (nextBill < now) {
            nextBill = new Date(now.getFullYear(), now.getMonth() + 1, billingDay);
          }

          // Check if unit has end_date and if it's before next bill date
          if (rentedUnit.end_date) {
            const endDate = new Date(rentedUnit.end_date);
            if (endDate < nextBill) {
              // Unit ends before next bill date, skip it
              continue;
            }
          }

          billingDates.push(nextBill);
        }
      }
    }

    // Find the earliest next bill date
    if (billingDates.length > 0) {
      nextBillDate = new Date(Math.min(...billingDates.map(d => d.getTime())));
    }

    // Format next bill date as DD/MM/YYYY
    const formatDate = (date) => {
      if (!date) return null;
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    res.status(200).json({
      success: true,
      message: "User billing information retrieved successfully",
      data: {
        user_id: user._id,
        user_name: user.name,
        user_email: user.email,
        balance_due: parseFloat(balanceDue.toFixed(2)),
        next_bill_date: formatDate(nextBillDate),
        next_bill_amount: parseFloat(nextBillAmount.toFixed(2)),
        details: {
          unpaid_invoices_count: unpaidInvoices.length,
          rented_units_count: rentedUnits.length,
          breakdown: {
            pending_invoices: unpaidInvoices.filter(inv => inv.status === 'pending').length,
            overdue_invoices: unpaidInvoices.filter(inv => inv.status === 'overdue').length,
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user billing info:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching user billing information",
      error: error.message,
    });
  }
};

// Add default invoices for all users (admin only)
export const addDefaultInvoicesForAllUsers = async (req, res) => {
  try {
    const currentUser = req.user;
    const userRoles = currentUser?.roles || [];
    const isAdmin = userRoles.includes('admin') || userRoles.includes('moderator');

    // Only admins can add default invoices for all users
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Administrator privileges are required.",
        code: "AUTH_FORBIDDEN"
      });
    }

    // Get all users
    const users = await User.find({});
    
    let totalCreated = 0;
    let totalSkipped = 0;
    const results = [];

    for (const user of users) {
      try {
        const result = await createDefaultInvoicesForUser(user);
        if (result.created > 0) {
          totalCreated += result.created;
          results.push({ userId: user._id, email: user.email, invoicesCreated: result.created });
        } else {
          totalSkipped++;
        }
      } catch (error) {
        console.error(`Error processing user ${user._id}:`, error);
        results.push({ userId: user._id, email: user.email, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Processed ${users.length} users. Created ${totalCreated} invoices, skipped ${totalSkipped} users (already had invoices).`,
      data: {
        totalUsers: users.length,
        totalInvoicesCreated: totalCreated,
        usersSkipped: totalSkipped,
        results
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating default invoices for all users",
      error: error.message,
    });
  }
};
