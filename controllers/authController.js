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

// Helper function to extract token from request (same as middleware)
const extractTokenFromRequest = (req) => {
  if (req?.cookies?.adminToken) {
    return { token: req.cookies.adminToken, source: 'adminCookie' };
  }

  if (req?.cookies?.token) {
    return { token: req.cookies.token, source: 'userCookie' };
  }

  if (req?.headers?.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return {
      token: req.headers.authorization.split(' ')[1],
      source: 'authorizationHeader'
    };
  }

  return { token: null, source: null };
};

// Refresh token - Issue new token even if current one is expired
export const refreshToken = async (req, res) => {
  try {
    console.log('[refresh-token] 🔄 Refresh token request received');
    
    // Extract token from request (even if expired)
    const { token, source } = extractTokenFromRequest(req);
    
    if (!token) {
      console.log('[refresh-token] ❌ No token provided');
      return res.status(401).json({
        success: false,
        message: "No token provided. Please log in.",
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    console.log(`[refresh-token] 🔍 Token source: ${source}`);

    // Try to verify token first (works if token is still valid)
    let decoded;
    let isExpired = false;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('[refresh-token] ✅ Token is still valid');
    } catch (error) {
      // If token is expired, decode without verification
      if (error.name === 'TokenExpiredError') {
        console.log('[refresh-token] ⚠️  Token expired, attempting to refresh...');
        isExpired = true;
        decoded = jwt.decode(token); // Decode without verification
      } else {
        // Other errors (invalid token, etc.)
        console.log(`[refresh-token] ❌ Invalid token: ${error.name}`);
        return res.status(401).json({
          success: false,
          message: "Invalid token. Please log in again.",
          code: 'AUTH_TOKEN_INVALID'
        });
      }
    }

    if (!decoded || !decoded.userId) {
      console.log('[refresh-token] ❌ Token does not contain userId');
      return res.status(401).json({
        success: false,
        message: "Invalid token format. Please log in again.",
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    // Verify user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log(`[refresh-token] ❌ User not found: ${decoded.userId}`);
      return res.status(401).json({
        success: false,
        message: "User account no longer exists. Please contact support.",
        code: 'AUTH_ACCOUNT_NOT_FOUND'
      });
    }

    console.log(`[refresh-token] ✅ User found: ${user.email}`);

    // Generate new token
    const newToken = generateToken(user._id);
    console.log('[refresh-token] ✅ New token generated');

    // Determine cookie name based on token source
    const cookieName = source === 'adminCookie' ? 'adminToken' : 'token';
    
    // Set new token in cookie
    res.cookie(cookieName, newToken, {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    console.log(`[refresh-token] ✅ Token refreshed successfully for ${user.email}`);

    res.status(200).json({
      success: true,
      message: isExpired ? "Token refreshed successfully. Your session has been extended." : "Token refreshed successfully.",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          roles: user.roles
        },
        token: newToken
      }
    });
  } catch (error) {
    console.error('[refresh-token] ❌ Error refreshing token:', error);
    res.status(401).json({
      success: false,
      message: "Unable to refresh token. Please log in again.",
      code: 'AUTH_REFRESH_FAILED',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Forgot password - send reset link
export const forgotPassword = async (req, res) => {
  console.log('[forgot-password] 📥 Request received');
  console.log('[forgot-password] Body:', req.body);
  console.log('[forgot-password] Headers:', req.headers);
  
  const { email } = req.body;

  if (!email) {
    console.log('[forgot-password] ❌ No email provided');
    return res.status(400).json({
      success: false,
      message: "Please provide the email address associated with your account.",
    });
  }

  console.log(`[forgot-password] 🔍 Looking up user with email: ${email}`);

  let user;

  try {
    // Case-insensitive email lookup (using regex for case-insensitive search)
    const emailLower = email.toLowerCase().trim();
    console.log(`[forgot-password] 🔍 Searching for email (normalized): ${emailLower}`);
    console.log(`[forgot-password] 🔍 Original email provided: ${email}`);
    
    // Try exact match first (since emails are stored lowercase)
    user = await User.findOne({ email: emailLower }).select("+passwordResetToken +passwordResetExpires");
    
    // If not found, try case-insensitive regex search as fallback
    if (!user) {
      console.log(`[forgot-password] 🔍 Exact match not found, trying case-insensitive search...`);
      user = await User.findOne({ 
        email: { $regex: new RegExp(`^${emailLower}$`, 'i') } 
      }).select("+passwordResetToken +passwordResetExpires");
    }
    
    if (user) {
      console.log(`[forgot-password] ✅ User found: ${user.name} (ID: ${user._id})`);
      console.log(`[forgot-password] 👤 User email in DB: ${user.email}`);
      console.log(`[forgot-password] 👤 User roles: ${user.roles.join(', ')}`);
    } else {
      console.log(`[forgot-password] ❌ User NOT found in database for email: ${emailLower}`);
      console.log(`[forgot-password] 💡 Tip: Make sure the user exists. You can check with: GET /api/users`);
      console.log(`[forgot-password] 💡 Tip: Email must match exactly (case-insensitive): ${emailLower}`);
    }

    if (!user) {
      // Respond with success message to avoid user enumeration
      console.log(`[forgot-password] ⚠️  User not found for email: ${email}`);
      return res.status(200).json({
        success: true,
        message: "If an account exists for that email, a reset link has been sent.",
      });
    }

    console.log(`[forgot-password] 🔑 Creating reset token for user: ${user._id}`);
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    console.log(`[forgot-password] ✅ Reset token created and saved`);

    const resetLink = `${CLIENT_URL}/reset-password?token=${resetToken}`;
    const resetMinutes = Number(process.env.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES) || 30;
    console.log(`[forgot-password] 🔗 Reset link: ${resetLink}`);
    console.log(`[forgot-password] ⏰ Token expires in: ${resetMinutes} minutes`);

    // Professional HTML email template
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - StorageUp</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
              <h1 style="color: #333333; margin: 0;">StorageUp</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px; background-color: #ffffff;">
              <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto;">
                <tr>
                  <td>
                    <h2 style="color: #333333; margin: 0 0 20px 0;">Password Reset Request</h2>
                    <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                      Hello ${user.name || "there"},
                    </p>
                    <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
                      We received a request to reset your password. Click the button below to create a new password:
                    </p>
                    <table role="presentation" style="margin: 30px 0;">
                      <tr>
                        <td style="text-align: center;">
                          <a href="${resetLink}" 
                             style="display: inline-block; padding: 14px 32px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 30px 0 20px 0;">
                      If the button doesn't work, copy and paste this link into your browser:
                    </p>
                    <p style="color: #007bff; font-size: 14px; line-height: 20px; margin: 0 0 30px 0; word-break: break-all;">
                      <a href="${resetLink}" style="color: #007bff; text-decoration: none;">${resetLink}</a>
                    </p>
                    <p style="color: #999999; font-size: 12px; line-height: 18px; margin: 30px 0 0 0;">
                      <strong>Important:</strong> This link will expire in ${resetMinutes} minutes for security reasons.
                    </p>
                    <p style="color: #999999; font-size: 12px; line-height: 18px; margin: 10px 0 0 0;">
                      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #f8f9fa;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} StorageUp. All rights reserved.
              </p>
              <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
                This is an automated email. Please do not reply to this message.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Plain text version for email clients that don't support HTML
    const text = `
Password Reset Request - StorageUp

Hello ${user.name || "there"},

We received a request to reset your password. Use the link below to create a new password:

${resetLink}

This link will expire in ${resetMinutes} minutes for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

© ${new Date().getFullYear()} StorageUp. All rights reserved.
This is an automated email. Please do not reply to this message.
    `;

    // Send email using Gmail/Brevo SMTP
    console.log(`[forgot-password] 📧 Attempting to send email to: ${user.email}`);
    console.log(`[forgot-password] 📧 Using SMTP: ${process.env.SMTP_HOST || 'Not configured'}`);
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;
    console.log(`[forgot-password] 📧 SMTP User: ${smtpUser ? 'Configured' : 'NOT configured'}`);
    console.log(`[forgot-password] 📧 SMTP Pass: ${smtpPass ? 'Configured' : 'NOT configured'}`);
    
    try {
      const emailResult = await sendEmail({
        to: user.email,
        subject: "Reset your StorageUp password",
        html,
        text: text.trim(),
      });
      
      console.log(`[forgot-password] ✅ Reset email sent successfully to ${user.email}`);
      console.log(`[forgot-password] 📧 Email Message ID: ${emailResult.messageId}`);
      console.log(`[forgot-password] 📧 Email Response: ${JSON.stringify(emailResult.response || 'No response')}`);
    } catch (emailError) {
      console.error(`[forgot-password] ❌ Email sending failed:`, emailError);
      console.error(`[forgot-password] ❌ Error details:`, {
        message: emailError.message,
        code: emailError.code,
        command: emailError.command,
        response: emailError.response
      });
      throw emailError; // Re-throw to be caught by outer catch
    }

    console.log(`[forgot-password] ✅ Successfully completed password reset request`);
    res.status(200).json({
      success: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });
  } catch (error) {
    console.error("[forgot-password] ❌ Error in forgot password flow:", error);
    console.error("[forgot-password] Error stack:", error.stack);

    // Clear the reset token if email sending failed
    if (user) {
      try {
        user.clearPasswordResetToken();
        await user.save({ validateBeforeSave: false });
      } catch (saveError) {
        console.error("[password-reset] Error clearing reset token:", saveError);
      }
    }

    // Check if it's an SMTP/email error
    if (error.code === 'EAUTH' || error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      return res.status(500).json({
        success: false,
        message: "Unable to send password reset email. Please check your email configuration or try again later.",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }

    res.status(500).json({
      success: false,
      message: "Unable to process password reset request. Please try again later.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Test email endpoint (for debugging)
export const testEmail = async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Please provide an email address to test."
    });
  }

  try {
    console.log(`[test-email] 📧 Testing email configuration`);
    console.log(`[test-email] 📧 SMTP Host: ${process.env.SMTP_HOST || 'Not configured'}`);
    console.log(`[test-email] 📧 SMTP User: ${process.env.SMTP_USER || 'Not configured'}`);
    console.log(`[test-email] 📧 SMTP Pass: ${process.env.SMTP_PASS ? '***configured***' : 'Not configured'}`);
    console.log(`[test-email] 📧 Email From: ${process.env.EMAIL_FROM || 'Not configured'}`);

    const testHtml = `
      <h1>Test Email from StorageUp</h1>
      <p>If you received this email, your SMTP configuration is working correctly!</p>
      <p>Time: ${new Date().toISOString()}</p>
    `;

    const testText = `Test Email from StorageUp - If you received this, SMTP is working! Time: ${new Date().toISOString()}`;

    const result = await sendEmail({
      to: email,
      subject: "StorageUp - Test Email",
      html: testHtml,
      text: testText,
    });

    console.log(`[test-email] ✅ Test email sent successfully`);
    console.log(`[test-email] 📧 Message ID: ${result.messageId}`);

    res.status(200).json({
      success: true,
      message: "Test email sent successfully! Check your inbox.",
      data: {
        messageId: result.messageId,
        to: email,
        smtpHost: process.env.SMTP_HOST
      }
    });
  } catch (error) {
    console.error(`[test-email] ❌ Error sending test email:`, error);
    res.status(500).json({
      success: false,
      message: "Failed to send test email",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? {
        code: error.code,
        command: error.command,
        response: error.response
      } : undefined
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
