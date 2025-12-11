// Overdue Invoice Detection Job
import Invoice from '../../models/Invoice.js';

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
    const overdueDetails = [];

    // Process each overdue invoice
    for (const invoice of overdueInvoices) {
      try {
        // Calculate days overdue
        const daysOverdue = Math.floor((today - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24));
        
        // Update invoice status to overdue
        invoice.status = 'overdue';
        await invoice.save();

        updatedCount++;
        totalOverdueAmount += invoice.amount;

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
      totalAmount: parseFloat(totalOverdueAmount.toFixed(2)),
      details: overdueDetails
    };

    console.log(`✅ Overdue detection completed:`);
    console.log(`   📊 Processed: ${result.processed} invoices`);
    console.log(`   ✏️  Updated: ${result.updated} invoices`);
    console.log(`   💰 Total overdue amount: $${result.totalAmount}`);

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
