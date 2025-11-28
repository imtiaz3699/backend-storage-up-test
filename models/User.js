import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { stringify } from "querystring";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    first_name: {
      type: String,
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    last_name: {
      type: String,
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [
        /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
        "Please provide a valid phone number",
      ],
    },
    address_line_one: {
      type: String,
      trim: true,
      maxlength: [200, "Address line one cannot exceed 200 characters"],
    },
    address_line_two: {
      type: String,
      trim: true,
      maxlength: [200, "Address line two cannot exceed 200 characters"],
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, "City cannot exceed 100 characters"],
    },
    state_province: {
      type: String,
      trim: true,
      maxlength: [100, "State/Province cannot exceed 100 characters"],
    },
    zip_code: {
      type: String,
      trim: true,
      maxlength: [20, "Zip code cannot exceed 20 characters"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
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

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
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
