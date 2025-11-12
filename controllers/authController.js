import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendEmail } from "../utils/emailService.js";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// Signup - Register a new user (Client side only)
export const signup = async (req, res) => {
  try {
    const { name, email, phoneNumber, password } = req.body;

    // Validation
    if (!name || !email || !phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, phone number, and password",
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

    // Create new user - Force 'user' role for client signup
    const user = new User({
      name,
      email,
      phoneNumber,
      password,
      roles: ["user"], // Always set to 'user' for client signup
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Set token in cookie
    res.cookie("token", token, {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user,
        token,
      },
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
      message: "Error during signup",
      error: error.message,
    });
  }
};

// Login - Authenticate user (Client side only)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if user is a regular user (not admin or moderator)
    const isRegularUser =
      user.roles.includes("user") &&
      !user.roles.includes("admin") &&
      !user.roles.includes("moderator");

    if (!isRegularUser) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Please use admin portal to login.",
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Set token in cookie
    res.cookie("token", token, {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error during login",
      error: error.message,
    });
  }
};

// Logout - Clear token cookie
export const logout = async (req, res) => {
  try {
    const cookieOptions = {
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };

    res.cookie("token", "", cookieOptions);
    res.cookie("adminToken", "", cookieOptions);

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error during logout",
      error: error.message,
    });
  }
};

// Get current user - Protected route
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
};

// Forgot password - send reset link
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Please provide the email address associated with your account.",
    });
  }

  let user;

  try {
    user = await User.findOne({ email }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      // Respond with success message to avoid user enumeration
      return res.status(200).json({
        success: true,
        message: "If an account exists for that email, a reset link has been sent.",
      });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetLink = `${CLIENT_URL}/reset-password?token=${resetToken}`;
    const resetMinutes = Number(process.env.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES) || 30;

    const html = `
      <p>Hello ${user.name || ""},</p>
      <p>You requested to reset your password. Please click the button below to continue:</p>
      <p><a href="${resetLink}" target="_blank" style="display:inline-block;padding:10px 20px;background-color:#007bff;color:#ffffff;text-decoration:none;border-radius:4px;">Reset Password</a></p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p><a href="${resetLink}" target="_blank">${resetLink}</a></p>
      <p>This link is valid for ${resetMinutes} minutes. If you didn't request a password reset, you can safely ignore this email.</p>
      <p>Thanks,<br/>StorageUp Team</p>
    `;

    await sendEmail({
      to: user.email,
      subject: "Reset your StorageUp password",
      html,
      text: `Reset your password using the following link (valid for ${resetMinutes} minutes): ${resetLink}`,
    });

    res.status(200).json({
      success: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Error sending password reset email:", error);

    if (user) {
      user.clearPasswordResetToken();
      await user.save({ validateBeforeSave: false });
    }

    res.status(500).json({
      success: false,
      message: "Unable to process password reset request. Please try again later.",
      error: error.message,
    });
  }
};

// Verify reset token
export const verifyResetToken = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: "Reset token is required.",
    });
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select("_id email name roles");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "The reset link is invalid or has expired. Please request a new one.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Reset token is valid.",
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to verify reset token.",
      error: error.message,
    });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (!token || !password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Token, password, and confirm password are required.",
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match.",
    });
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpires +password");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "The reset link is invalid or has expired. Please request a new one.",
      });
    }

    user.password = password;
    user.clearPasswordResetToken();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to reset password at this time.",
      error: error.message,
    });
  }
};

// Admin Login - Authenticate admin user (Admin side only)
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if user has admin or moderator role
    const hasAdminAccess =
      user.roles.includes("admin") || user.roles.includes("moderator");

    if (!hasAdminAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Set token in cookie
    res.cookie("adminToken", token, {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({
      success: true,
      message: "Admin login successful",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error during admin login",
      error: error.message,
    });
  }
};

// Admin Signup - Register a new admin user (Restricted)
export const adminSignup = async (req, res) => {
  try {
    const { name, email, phoneNumber, password, role } = req.body;

    // Validation
    if (!name || !email || !phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, phone number, and password",
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

    // Validate role
    const adminRole =
      role && (role === "admin" || role === "moderator") ? role : "admin";

    // Create new admin user
    const user = new User({
      name,
      email,
      phoneNumber,
      password,
      roles: [adminRole],
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Set token in cookie
    res.cookie("adminToken", token, {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(201).json({
      success: true,
      message: "Admin user registered successfully",
      data: {
        user,
        token,
      },
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
      message: "Error during admin signup",
      error: error.message,
    });
  }
};
