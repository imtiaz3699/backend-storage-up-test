import nodemailer from 'nodemailer';

const {
  EMAIL_FROM,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  NODE_ENV
} = process.env;

let transporter;
let usingEthereal = false;

const initTransporter = async () => {
  if (transporter) {
    return transporter;
  }

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: (SMTP_SECURE || '').toLowerCase() === 'true',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
    usingEthereal = false;
    return transporter;
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

  console.info('[email] Using Ethereal test account for email delivery');
  console.info(`[email] Login: ${testAccount.user}`);
  console.info(`[email] Password: ${testAccount.pass}`);

  return transporter;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const activeTransporter = await initTransporter();

  const fromAddress = EMAIL_FROM || 'StorageUp Dev <no-reply@storageup.dev>';

  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    html,
    text
  };

  const info = await activeTransporter.sendMail(mailOptions);

  if (usingEthereal && NODE_ENV !== 'production') {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.info(`[email] Preview URL: ${previewUrl}`);
    }
  }

  return info;
};


