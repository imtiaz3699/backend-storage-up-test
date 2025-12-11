// Payment Reminder Email Job
import Invoice from '../../models/Invoice.js';
import { sendEmail } from '../../utils/emailService.js';

/**
 * Daily job to send payment reminder emails
 * Runs at 9:00 AM daily to remind customers of upcoming and overdue payments
 * @param {Date} processingDate - Optional date to process for (defaults to today)
 */
export const paymentReminderEmails = async (processingDate = null) => {
  const startTime = new Date();
  const processDate = processingDate || new Date();
  processDate.setHours(0, 0, 0, 0);
  
  console.log(`📧 Starting payment reminder emails at ${startTime.toISOString()}`);
  console.log(`📅 Processing date: ${processDate.toISOString().split('T')[0]}`);

  try {
    const today = processDate;

    // Define reminder schedules
    const reminderSchedules = [
      {
        type: 'due_today',
        description: 'Due Today',
        query: {
          status: 'pending',
          due_date: {
            $gte: today,
            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        type: 'due_tomorrow',
        description: 'Due Tomorrow',
        query: {
          status: 'pending',
          due_date: {
            $gte: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            $lt: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        type: 'due_in_3_days',
        description: 'Due in 3 Days',
        query: {
          status: 'pending',
          due_date: {
            $gte: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
            $lt: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        type: 'overdue_5_days',
        description: 'Overdue (5+ days)',
        query: {
          status: 'overdue',
          due_date: {
            $lt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)
          }
        }
      }
    ];

    let totalSent = 0;
    let totalFailed = 0;
    const reminderDetails = [];

    for (const schedule of reminderSchedules) {
      console.log(`📋 Processing: ${schedule.description}`);
      
      try {
        // Find invoices matching this schedule
        const invoices = await Invoice.find(schedule.query)
          .populate('customer_id', 'name first_name last_name email');

        if (invoices.length === 0) {
          console.log(`   ✅ No invoices found for ${schedule.description}`);
          continue;
        }

        console.log(`   📧 Found ${invoices.length} invoices for ${schedule.description}`);

        let sentCount = 0;
        let failedCount = 0;

        for (const invoice of invoices) {
          try {
            // Skip if no customer email
            if (!invoice.customer_email) {
              console.log(`   ⚠️  No email for invoice ${invoice.invoice_id} (${invoice.customer_name})`);
              continue;
            }

            // Calculate days until/past due
            const daysDiff = Math.ceil((new Date(invoice.due_date) - today) / (1000 * 60 * 60 * 24));
            
            // Generate email content based on reminder type
            const emailContent = generateReminderEmail(invoice, schedule.type, daysDiff);
            
            // Send email
            await sendEmail({
              to: invoice.customer_email,
              subject: emailContent.subject,
              text: emailContent.text,
              html: emailContent.html
            });

            sentCount++;
            console.log(`     ✅ Sent to ${invoice.customer_email} (${invoice.invoice_id})`);

          } catch (emailError) {
            failedCount++;
            console.error(`     ❌ Failed to send to ${invoice.customer_email} (${invoice.invoice_id}):`, emailError.message);
          }
        }

        totalSent += sentCount;
        totalFailed += failedCount;

        reminderDetails.push({
          type: schedule.type,
          description: schedule.description,
          totalInvoices: invoices.length,
          sent: sentCount,
          failed: failedCount
        });

      } catch (error) {
        console.error(`❌ Error processing ${schedule.description}:`, error.message);
      }
    }

    const result = {
      totalSent,
      totalFailed,
      successRate: totalSent + totalFailed > 0 
        ? parseFloat(((totalSent / (totalSent + totalFailed)) * 100).toFixed(1))
        : 0,
      reminderTypes: reminderDetails
    };

    console.log(`✅ Payment reminders completed:`);
    console.log(`   📧 Sent: ${result.totalSent} emails`);
    console.log(`   ❌ Failed: ${result.totalFailed} emails`);
    console.log(`   📈 Success rate: ${result.successRate}%`);

    return result;

  } catch (error) {
    console.error('❌ Fatal error in payment reminder emails:', error);
    throw error;
  }
};

/**
 * Generate email content based on reminder type
 */
const generateReminderEmail = (invoice, reminderType, daysDiff) => {
  const customerName = invoice.customer_name;
  const invoiceId = invoice.invoice_id;
  const amount = `$${invoice.amount.toFixed(2)}`;
  const dueDate = new Date(invoice.due_date).toLocaleDateString();
  const unitNumbers = Array.isArray(invoice.unit_number) 
    ? invoice.unit_number.join(', ') 
    : invoice.unit_number;

  let subject, urgencyLevel, message, actionText;

  switch (reminderType) {
    case 'due_in_3_days':
      subject = `Payment Reminder: Invoice ${invoiceId} Due in 3 Days`;
      urgencyLevel = 'upcoming';
      message = `Your invoice ${invoiceId} for unit(s) ${unitNumbers} is due in 3 days (${dueDate}).`;
      actionText = 'Please ensure payment is made by the due date to avoid late fees.';
      break;
    
    case 'due_tomorrow':
      subject = `Payment Due Tomorrow: Invoice ${invoiceId}`;
      urgencyLevel = 'urgent';
      message = `Your invoice ${invoiceId} for unit(s) ${unitNumbers} is due tomorrow (${dueDate}).`;
      actionText = 'Please make payment immediately to avoid late fees.';
      break;
    
    case 'due_today':
      subject = `Payment Due TODAY: Invoice ${invoiceId}`;
      urgencyLevel = 'critical';
      message = `Your invoice ${invoiceId} for unit(s) ${unitNumbers} is due TODAY (${dueDate}).`;
      actionText = 'Please make payment today to avoid late fees.';
      break;
    
    case 'overdue_5_days':
      subject = `OVERDUE: Invoice ${invoiceId} - Late Fees May Apply`;
      urgencyLevel = 'overdue';
      message = `Your invoice ${invoiceId} for unit(s) ${unitNumbers} is now ${Math.abs(daysDiff)} days overdue.`;
      actionText = 'Please make payment immediately. Late fees may have been applied to your account.';
      break;
    
    default:
      subject = `Payment Reminder: Invoice ${invoiceId}`;
      urgencyLevel = 'general';
      message = `Your invoice ${invoiceId} for unit(s) ${unitNumbers} requires attention.`;
      actionText = 'Please make payment at your earliest convenience.';
  }

  // Text version
  const text = `
Dear ${customerName},

${message}

Invoice Details:
- Invoice ID: ${invoiceId}
- Amount Due: ${amount}
- Due Date: ${dueDate}
- Unit(s): ${unitNumbers}

${actionText}

You can make payment by:
- Online portal: ${process.env.CLIENT_URL || 'https://your-portal.com'}/payments
- Phone: Contact our office
- Mail: Send check with invoice number

Thank you for your prompt attention to this matter.

Best regards,
StorageUp Management

---
This is an automated reminder. Please do not reply to this email.
  `.trim();

  // HTML version
  const urgencyColors = {
    upcoming: '#3b82f6',    // Blue
    urgent: '#f59e0b',      // Orange  
    critical: '#dc2626',    // Red
    overdue: '#991b1b',     // Dark red
    general: '#6b7280'      // Gray
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: ${urgencyColors[urgencyLevel]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">${urgencyLevel === 'overdue' ? '🚨 ' : '📧 '}Payment Reminder</h2>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
        <p><strong>Dear ${customerName},</strong></p>
        
        <p>${message}</p>
        
        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: ${urgencyColors[urgencyLevel]};">Invoice Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Invoice ID:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${invoiceId}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Amount Due:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-size: 1.2em; font-weight: bold; color: ${urgencyColors[urgencyLevel]};">${amount}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Due Date:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${dueDate}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;"><strong>Unit(s):</strong></td>
                    <td style="padding: 8px 0;">${unitNumbers}</td>
                </tr>
            </table>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Action Required:</strong> ${actionText}</p>
        </div>
        
        <h3 style="color: ${urgencyColors[urgencyLevel]};">Payment Options:</h3>
        <ul>
            <li><strong>Online:</strong> <a href="${process.env.CLIENT_URL || 'https://your-portal.com'}/payments" style="color: ${urgencyColors[urgencyLevel]};">Customer Portal</a></li>
            <li><strong>Phone:</strong> Contact our office</li>
            <li><strong>Mail:</strong> Send check with invoice number</li>
        </ul>
        
        <p><em>Thank you for your prompt attention to this matter.</em></p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
        
        <p style="font-size: 0.9em; color: #6c757d;">
            Best regards,<br>
            <strong>StorageUp Management</strong>
        </p>
        
        <p style="font-size: 0.8em; color: #6c757d; margin-top: 30px;">
            This is an automated reminder. Please do not reply to this email.
        </p>
    </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
};
