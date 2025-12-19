// Overdue Invoice Detection Job
import Invoice from '../../models/Invoice.js';
import Notification from '../../models/Notification.js';
import { emitNotificationToUser } from '../../utils/socketService.js';

/**
 * Daily job to detect and update overdue invoices
 * Runs at 12:01 AM daily to catch invoices that became overdue
 * @param {Date} processingDate - Optional date to process for (defaults to today)
 */
export const overdueInvoiceDetection = async (processingDate = null) => {
  const startTime = new Date();
  const processDate = processingDate || new Date();
  processDate.setHours(0, 0, 0, 0);
  
  console.log(`🔍 Starting overdue invoice detection at ${startTime.toISOString()}`);
  console.log(`📅 Processing date: ${processDate.toISOString().split('T')[0]}`);

  try {
    // Find all pending invoices where due_date is before the processing date
    const today = processDate;

    // Query for pending invoices with due_date before today
    const overdueInvoices = await Invoice.find({
      status: 'pending',
      due_date: { $lt: today }
    }).populate('customer_id', 'name email phoneNumber');

    if (overdueInvoices.length === 0) {
      console.log('✅ No overdue invoices found');
      return {
        processed: 0,
        updated: 0,
        totalAmount: 0
      };
    }

    console.log(`📋 Found ${overdueInvoices.length} overdue invoices to process`);

    let updatedCount = 0;
    let totalOverdueAmount = 0;
    let notificationsSent = 0;
    const overdueDetails = [];

    // Process each overdue invoice
    for (const invoice of overdueInvoices) {
      try {
        // Skip if no customer_id
        if (!invoice.customer_id) {
          console.log(`   ⚠️  No customer_id for invoice ${invoice.invoice_id}`);
          continue;
        }

        const customerId = invoice.customer_id._id || invoice.customer_id;
        
        // Calculate days overdue
        const daysOverdue = Math.floor((today - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24));
        
        // Update invoice status to overdue
        invoice.status = 'overdue';
        await invoice.save();

        updatedCount++;
        totalOverdueAmount += invoice.amount;

        // Send socket notification to user
        try {
          // Create notification in database
          const notification = await Notification.create({
            user_id: customerId,
            type: 'invoice_overdue',
            title: 'Invoice Overdue',
            message: `Your invoice ${invoice.invoice_id} is now overdue. Amount: $${invoice.amount.toFixed(2)}${daysOverdue > 0 ? ` (${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue)` : ''}`,
            data: {
              invoice_id: invoice._id.toString(),
              invoice_number: invoice.invoice_id,
              amount: invoice.amount,
              due_date: invoice.due_date,
              status: 'overdue',
              days_overdue: daysOverdue
            }
          });

          // Emit socket notification
          emitNotificationToUser(customerId.toString(), {
            id: notification._id.toString(),
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            read: notification.read,
            createdAt: notification.createdAt
          });

          notificationsSent++;
          console.log(`   🔔 Notification sent to user ${customerId} for overdue invoice ${invoice.invoice_id}`);

        } catch (notificationError) {
          console.error(`   ❌ Failed to send notification for invoice ${invoice.invoice_id}:`, notificationError.message);
        }

        // Store details for reporting
        overdueDetails.push({
          invoice_id: invoice.invoice_id,
          customer_name: invoice.customer_name,
          customer_email: invoice.customer_email,
          amount: invoice.amount,
          due_date: invoice.due_date,
          days_overdue: daysOverdue
        });

        console.log(`   ➡️ Updated invoice ${invoice.invoice_id} (${invoice.customer_name}) - $${invoice.amount} (${daysOverdue} days overdue)`);

      } catch (error) {
        console.error(`❌ Error updating invoice ${invoice.invoice_id}:`, error.message);
      }
    }

    // Summary statistics
    const result = {
      processed: overdueInvoices.length,
      updated: updatedCount,
      notificationsSent: notificationsSent,
      totalAmount: parseFloat(totalOverdueAmount.toFixed(2)),
      details: overdueDetails
    };

    console.log(`✅ Overdue detection completed:`);
    console.log(`   📊 Processed: ${result.processed} invoices`);
    console.log(`   ✏️  Updated: ${result.updated} invoices`);
    console.log(`   🔔 Notifications sent: ${result.notificationsSent}`);
    console.log(`   💰 Total overdue amount: $${result.totalAmount}`);

    // Send admin notification for overdue invoices batch
    if (result.updated > 0) {
      try {
        const { emitNotificationToAdmin } = await import('../../utils/socketService.js');
        await emitNotificationToAdmin({
          type: 'invoice_overdue',
          title: 'Invoices Marked Overdue',
          message: `${result.updated} invoice${result.updated > 1 ? 's' : ''} marked as overdue. Total amount: $${result.totalAmount.toFixed(2)}`,
          priority: 'high',
          data: {
            count: result.updated,
            total_amount: result.totalAmount,
            processing_date: processDate.toISOString().split('T')[0],
            invoices: overdueDetails.slice(0, 10) // Limit to first 10 for notification payload
          }
        });
        console.log(`📢 Admin notification sent for ${result.updated} overdue invoices`);
      } catch (adminNotificationError) {
        console.error(`❌ Failed to send admin notification for overdue invoices:`, adminNotificationError.message);
      }
    }

    // Optional: Send admin alert for high-value overdue invoices
    const highValueThreshold = parseFloat(process.env.HIGH_VALUE_OVERDUE_THRESHOLD) || 500;
    const highValueOverdue = overdueDetails.filter(inv => inv.amount >= highValueThreshold);
    
    if (highValueOverdue.length > 0) {
      console.log(`🚨 HIGH VALUE ALERT: ${highValueOverdue.length} invoices over $${highValueThreshold}`);
      // TODO: Send admin email alert (implement in future update)
    }

    return result;

  } catch (error) {
    console.error('❌ Fatal error in overdue invoice detection:', error);
    throw error;
  }
};

/**
 * Get current overdue statistics (for admin dashboard)
 */
export const getOverdueStats = async () => {
  try {
    const today = new Date();
    
    // Get all overdue invoices with aging buckets
    const overdueInvoices = await Invoice.find({ status: 'overdue' });
    
    let total = 0;
    let count = 0;
    const aging = {
      '1-30_days': { count: 0, amount: 0 },
      '31-60_days': { count: 0, amount: 0 },
      '61-90_days': { count: 0, amount: 0 },
      'over_90_days': { count: 0, amount: 0 }
    };

    for (const invoice of overdueInvoices) {
      const daysOverdue = Math.floor((today - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24));
      
      total += invoice.amount;
      count++;

      if (daysOverdue <= 30) {
        aging['1-30_days'].count++;
        aging['1-30_days'].amount += invoice.amount;
      } else if (daysOverdue <= 60) {
        aging['31-60_days'].count++;
        aging['31-60_days'].amount += invoice.amount;
      } else if (daysOverdue <= 90) {
        aging['61-90_days'].count++;
        aging['61-90_days'].amount += invoice.amount;
      } else {
        aging['over_90_days'].count++;
        aging['over_90_days'].amount += invoice.amount;
      }
    }

    return {
      totalOverdue: {
        count,
        amount: parseFloat(total.toFixed(2))
      },
      aging: Object.keys(aging).reduce((acc, key) => {
        acc[key] = {
          count: aging[key].count,
          amount: parseFloat(aging[key].amount.toFixed(2))
        };
        return acc;
      }, {})
    };

  } catch (error) {
    console.error('Error getting overdue stats:', error);
    throw error;
  }
};
