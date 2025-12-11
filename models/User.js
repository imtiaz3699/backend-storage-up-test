import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

// Schema for rented units with all required keys
const rentedUnitSchema = new mongoose.Schema({
  unit_id: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId
    ref: "Unit",
    required: true
  },
  billing_cycle: {
    type: String,
    trim: true,
    default: ''
  },
  deposit_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  start_date: {
    type: Date,
    default: null
  },
  end_date: {
    type: Date,
    default: null
  }
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BillingPlan",
    required: true
  },
  unit_type: {
    type: {
      type: String,
      trim: true,
      default: ""
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      trim: true,
      default: ""
    },
    next_invoice_date: {
      type: Date,
      default: null
    },
    next_invoice_amount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired'],
    default: 'active'
  },
  started_at: {
    type: Date,
    default: Date.now
  },
  ends_at: {
    type: Date,
    default: null
  },
  cancelled_at: {
    type: Date,
    default: null
  },
  price_paid: {
    type: Number,
    default: 0
  }
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long."],
      maxlength: [100, "Name cannot exceed 100 characters."],
    },
    first_name: {
      type: String,
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters."],
    },
    last_name: {
      type: String,
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address."],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required."],
      trim: true,
      match: [
        /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
        "Please provide a valid phone number.",
      ],
    },
    address_line_one: {
      type: String,
      trim: true,
      maxlength: [200, "Address line one cannot exceed 200 characters."],
    },
    address_line_two: {
      type: String,
      trim: true,
      maxlength: [200, "Address line two cannot exceed 200 characters."],
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, "City cannot exceed 100 characters."],
    },
    state_province: {
      type: String,
      trim: true,
      maxlength: [100, "State/Province cannot exceed 100 characters."],
    },
    zip_code: {
      type: String,
      trim: true,
      maxlength: [20, "Zip code cannot exceed 20 characters."],
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: [6, "Password must be at least 6 characters long."],
      select: false, // Don't return password by default in queries
    },
    roles: {
      type: [String],
      default: ["user"],
      enum: {
        values: ["user", "admin", "moderator"],
        message: "Role must be one of: user, admin, moderator",
      },
    },
    secondaryContactName: {
      type: String,
      trim: true,
      required: false,
    },
    secondaryPhoneNumber: {
      type: String,
      trim: true,
      required: false,
    },
    secondaryEmail: {
      type: String,
      trim: true,
      required: false,
    },
    language: {
      type: String,
      trim: true,
      required: false,
    },
    other: {
      type: String,
      trim: true,
      required: false,
    },

    passwordResetToken: {
      type: String,
      select: false,
    },
    unit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
    },
    rented_units: {
      type: [rentedUnitSchema],
      default: []
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    stripe_customer_id: {
      type: String,
      trim: true,
    },
    id_document: {
      type: String,
      trim: true,
    },
    contract_copy: {
      type: String,
      trim: true,
    },
    additional_records: {
      type: String,
      trim: true,
    },
    transactions: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Transaction",
      default: []
    },
    subscriptions: {
      type: [subscriptionSchema],
      default: []
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) {
    return next();
  }

  try {
    // Hash password with cost of 10
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output and ensure all fields are included
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  
  // Ensure optional fields are always included (even if undefined/null)
  // This is important for fields added later to the schema
  const fieldsToInclude = [
    'first_name',
    'last_name',
    'address_line_one',
    'address_line_two',
    'city',
    'state_province',
    'zip_code',
    'secondaryContactName',
    'secondaryPhoneNumber',
    'secondaryEmail',
    'language',
    'other',
    'unit_id',
    'rented_units',
    'stripe_customer_id',
    'id_document',
    'contract_copy',
    'additional_records',
    'transactions',
    'subscriptions'
  ];
  
  // Set undefined fields to null so they appear in JSON
  fieldsToInclude.forEach(field => {
    if (userObject[field] === undefined) {
      // Ensure rented_units is always an array, not null
      if (field === 'rented_units') {
        userObject[field] = [];
      } else {
        userObject[field] = null;
      }
    }
  });
  
  // Ensure rented_units is always an array
  if (!Array.isArray(userObject.rented_units)) {
    userObject.rented_units = userObject.rented_units || [];
  }

  // Ensure transactions is always an array
  if (!Array.isArray(userObject.transactions)) {
    userObject.transactions = userObject.transactions || [];
  }
  // Ensure subscriptions is always an array
  if (!Array.isArray(userObject.subscriptions)) {
    userObject.subscriptions = userObject.subscriptions || [];
  }
  
  return userObject;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  const tokenExpiryMinutes =
    Number(process.env.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES) || 30;

  this.passwordResetToken = hashedToken;
  this.passwordResetExpires = new Date(
    Date.now() + tokenExpiryMinutes * 60 * 1000
  );

  return resetToken;
};

userSchema.methods.clearPasswordResetToken = function () {
  this.passwordResetToken = undefined;
  this.passwordResetExpires = undefined;
};

const User = mongoose.model("User", userSchema);

export default User;
