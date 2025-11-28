import nodemailer from 'nodemailer';

const {
  EMAIL_FROM,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_PASSWORD, // Support both SMTP_PASS and SMTP_PASSWORD
  EMAIL_USER, // Support EMAIL_USER as alternative to SMTP_USER
  EMAIL_PASSWORD, // Support EMAIL_PASSWORD as alternative to SMTP_PASS/SMTP_PASSWORD
  // Second Brevo account (optional)
  SMTP_HOST_2,
  SMTP_PORT_2,
  SMTP_SECURE_2,
  SMTP_USER_2,
  SMTP_PASS_2,
  SMTP_PASSWORD_2, // Support both SMTP_PASS_2 and SMTP_PASSWORD_2
  EMAIL_FROM_2,
  NODE_ENV
} = process.env;

// Support multiple variable name formats for flexibility
const SMTP_USER_FINAL = SMTP_USER || EMAIL_USER;
const SMTP_PASSWORD_FINAL = SMTP_PASS || SMTP_PASSWORD || EMAIL_PASSWORD;
const SMTP_PASSWORD_2_FINAL = SMTP_PASS_2 || SMTP_PASSWORD_2;

let transporter;
let transporter2;
let usingEthereal = false;

// Initialize primary transporter
const initTransporter = async () => {
  if (transporter) {
    return transporter;
  }

  if (SMTP_HOST && SMTP_USER_FINAL && SMTP_PASSWORD_FINAL) {
    // Gmail-specific configuration
    const isGmail = SMTP_HOST === 'smtp.gmail.com';
    
    console.info(`[email] 🔧 Initializing SMTP transporter for: ${SMTP_HOST}`);
    console.info(`[email] 🔧 SMTP User: ${SMTP_USER_FINAL}`);
    console.info(`[email] 🔧 SMTP Password: ${SMTP_PASSWORD_FINAL ? '***' + SMTP_PASSWORD_FINAL.slice(-4) : 'NOT SET'}`);
    
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || (isGmail ? 587 : 587),
      secure: (SMTP_SECURE || '').toLowerCase() === 'true' || (isGmail && Number(SMTP_PORT) === 465),
      auth: {
        user: SMTP_USER_FINAL,
        pass: SMTP_PASSWORD_FINAL
      },
      // Connection timeout settings
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
      // TLS options for Gmail
      ...(isGmail && {
        tls: {
          rejectUnauthorized: false // Gmail requires this
        }
      }),
      // Retry settings
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    });
    
    // Verify connection - CRITICAL: Don't fall back to Ethereal if this fails
    try {
      console.info('[email] 🔍 Verifying SMTP connection...');
      await transporter.verify();
      console.info('[email] ✅ Primary SMTP transporter initialized and verified');
      console.info(`[email] Connected to: ${SMTP_HOST}:${SMTP_PORT || 587}`);
      usingEthereal = false;
      return transporter;
    } catch (error) {
      console.error('[email] ❌ SMTP connection verification FAILED:', error.message);
      console.error('[email] ❌ Error code:', error.code);
      console.error('[email] ❌ Error command:', error.command);
      console.error('[email] Please check your SMTP credentials in .env file');
      
      if (SMTP_HOST === 'smtp.gmail.com') {
        console.error('[email] 🔑 Gmail Authentication Error - Checklist:');
        console.error('[email]   1. Make sure you\'re using an App Password (16 characters), not your regular password');
        console.error('[email]   2. Enable 2-Step Verification: https://myaccount.google.com/security');
        console.error('[email]   3. Generate App Password: https://myaccount.google.com/apppasswords');
        console.error('[email]   4. Remove spaces from the App Password');
        console.error('[email]   5. Use your full Gmail address for EMAIL_USER');
        if (error.code === 'EAUTH') {
          console.error('[email]   ⚠️  AUTHENTICATION FAILED - Your App Password is incorrect!');
          console.error('[email]   ⚠️  Double-check your EMAIL_PASSWORD in .env file');
        } else if (error.code === 'ECONNECTION') {
          console.error('[email]   ⚠️  CONNECTION FAILED - Check your internet or firewall');
        }
      }
      
      // DON'T fall back to Ethereal - throw the error so user knows it failed
      console.error('[email] ❌ Will NOT use Ethereal fallback - Gmail configuration must be fixed');
      throw new Error(`SMTP connection failed: ${error.message}. Please fix your Gmail credentials.`);
    }
  }

  // Only use Ethereal if SMTP is completely not configured
  // If SMTP_HOST is set but credentials are wrong, don't fall back to Ethereal
  if (SMTP_HOST) {
    throw new Error(`SMTP_HOST is set (${SMTP_HOST}) but SMTP credentials are missing or invalid. Please check EMAIL_USER and EMAIL_PASSWORD in .env file.`);
  }

  const testAccount = await nodemailer.createTestAccount();

  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  usingEthereal = true;

  console.info('[email] Using Ethereal test account for email delivery (SMTP not configured)');
  console.info(`[email] Login: ${testAccount?.user}`);
  console.info(`[email] Password: ${testAccount?.pass}`);

  return transporter;
};

// Initialize secondary transporter (for second Brevo account)
const initTransporter2 = async () => {
  if (transporter2) {
    return transporter2;
  }

  if (SMTP_HOST_2 && SMTP_USER_2 && SMTP_PASSWORD_2_FINAL) {
    transporter2 = nodemailer.createTransport({
      host: SMTP_HOST_2,
      port: Number(SMTP_PORT_2) || 587,
      secure: (SMTP_SECURE_2 || '').toLowerCase() === 'true',
      auth: {
        user: SMTP_USER_2,
        pass: SMTP_PASSWORD_2_FINAL
      },
      // Connection timeout settings for Brevo
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    });
    
    // Verify connection
    try {
      await transporter2.verify();
      console.info('[email] ✅ Secondary SMTP transporter initialized and verified');
      console.info(`[email] Connected to: ${SMTP_HOST_2}:${SMTP_PORT_2 || 587}`);
    } catch (error) {
      console.error('[email] ❌ Secondary SMTP connection verification failed:', error.message);
    }
    
    return transporter2;
  }

  // If second account not configured, use primary
  console.info('[email] Secondary SMTP not configured, using primary account');
  return await initTransporter();
};

/**
 * Send email using primary or secondary SMTP account
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content
 * @param {string} options.useAccount - 'primary' or 'secondary' (default: 'primary')
 * @param {string} options.from - Override from address (optional)
 */
export const sendEmail = async ({ to, subject, html, text, useAccount = 'primary', from }) => {
  let activeTransporter;
  
  if (useAccount === 'secondary') {
    activeTransporter = await initTransporter2();
    const fromAddress = from || EMAIL_FROM_2 || EMAIL_FROM || 'StorageUp Dev <no-reply@storageup.dev>';
    
    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      html,
      text
    };

    try {
      const info = await activeTransporter.sendMail(mailOptions);
      console.info(`[email] 📧 Email sent successfully to ${to} (secondary account)`);
      console.info(`[email] Message ID: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error('[email] ❌ Error sending email (secondary account):', error.message);
      if (error.code) {
        console.error(`[email] Error code: ${error.code}`);
      }
      throw error;
    }
  }

  // Primary account (default)
  activeTransporter = await initTransporter();
  const fromAddress = from || EMAIL_FROM || 'StorageUp Dev <no-reply@storageup.dev>';

  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    html,
    text
  };

  try {
    const info = await activeTransporter.sendMail(mailOptions);
    
    if (usingEthereal && NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.info(`[email] 📧 Preview URL: ${previewUrl}`);
      }
    } else {
      console.info(`[email] 📧 Email sent successfully to ${to}`);
      console.info(`[email] Message ID: ${info.messageId}`);
    }
    
    return info;
  } catch (error) {
    console.error('[email] ❌ Error sending email:', error.message);
    if (error.code) {
      console.error(`[email] Error code: ${error.code}`);
      
      // Gmail-specific error messages
      if (SMTP_HOST === 'smtp.gmail.com') {
        if (error.code === 'EAUTH') {
          console.error('[email] 🔑 Gmail Authentication Error:');
          console.error('[email]   - Make sure you\'re using an App Password (not your regular password)');
          console.error('[email]   - App Password must be 16 characters (remove spaces)');
          console.error('[email]   - Get App Password: https://myaccount.google.com/apppasswords');
        } else if (error.code === 'ECONNECTION') {
          console.error('[email] 🔌 Gmail Connection Error:');
          console.error('[email]   - Check your internet connection');
          console.error('[email]   - Gmail SMTP might be blocked by firewall');
        }
      }
    }
    throw error;
  }
};


