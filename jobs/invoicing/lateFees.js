// Late Fees Processor Job
import Invoice from '../../models/Invoice.js';
import NoticeSetup from '../../models/NoticeSetup.js';

/**
 * Daily job to apply late fees to overdue invoices
 * Runs at 12:30 AM daily (after overdue detection completes)
 * @param {Date} processingDate - Optional date to process for (defaults to today)
 */
export const lateFeesProcessor = async (processingDate = null) => {
  const startTime = new Date();
  const processDate = processingDate || new Date();
  processDate.setHours(0, 0, 0, 0);
  
  console.log(`💸 Starting late fees processing at ${startTime.toISOString()}`);
  console.log(`📅 Processing date: ${processDate.toISOString().split('T')[0]}`);

  try {
    // Find all overdue invoices that haven't been cancelled
    const overdueInvoices = await Invoice.find({
      status: 'overdue'
    }).populate('customer_id', 'name email');

    if (overdueInvoices.length === 0) {
      console.log('✅ No overdue invoices found for late fee processing');
      return {
        processed: 0,
        feesApplied: 0,
        totalFeesAmount: 0
      };
    }

    console.log(`📋 Found ${overdueInvoices.length} overdue invoices for late fee processing`);

    // Get late fee configuration from NoticeSetup
    const lateFeeConfigs = await NoticeSetup.find({
      'notice_charges.notice_fee_setup.simplified_charge_system': { $exists: true }
    });

    // Default late fee configuration if none found
    let defaultLateFee = {
      minimumCharge: parseFloat(process.env.DEFAULT_LATE_FEE_MINIMUM) || 25.00,
      percentageRate: parseFloat(process.env.DEFAULT_LATE_FEE_PERCENTAGE) || 5.0
    };

    // Use first available configuration from NoticeSetup
    if (lateFeeConfigs.length > 0) {
      const config = lateFeeConfigs[0].notice_charges.notice_fee_setup.simplified_charge_system;
      defaultLateFee = {
        minimumCharge: config.minimum_charge || defaultLateFee.minimumCharge,
        percentageRate: config.minimum_percentage || defaultLateFee.percentageRate
      };
    }

    console.log(`💰 Using late fee config: Min $${defaultLateFee.minimumCharge}, ${defaultLateFee.percentageRate}%`);

    let processedCount = 0;
    let feesAppliedCount = 0;
    let totalFeesAmount = 0;
    const feeDetails = [];

    const today = processDate;

    for (const invoice of overdueInvoices) {
      try {
        processedCount++;

        // Calculate days overdue
        const daysOverdue = Math.floor((today - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24));
        
        // Skip if not overdue long enough (grace period)
        const gracePeriodDays = parseInt(process.env.LATE_FEE_GRACE_PERIOD_DAYS) || 5;
        if (daysOverdue < gracePeriodDays) {
          console.log(`   ⏳ Invoice ${invoice.invoice_id} - ${daysOverdue} days overdue (within ${gracePeriodDays} day grace period)`);
          continue;
        }

        // Check if we've already applied late fees recently
        // Look for existing late fee invoices for this customer in the last 30 days
        const recentLateFeeInvoice = await Invoice.findOne({
          customer_id: invoice.customer_id,
          invoice_id: { $regex: new RegExp(`${invoice.invoice_id}_LATE_FEE`, 'i') },
          createdAt: { 
            $gte: new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000)) // Last 30 days
          }
        });

        if (recentLateFeeInvoice) {
          console.log(`   🔄 Invoice ${invoice.invoice_id} - Late fee already applied recently`);
          continue;
        }

        // Calculate late fee amount
        const percentageFee = (invoice.amount * defaultLateFee.percentageRate) / 100;
        const lateFeeAmount = Math.max(percentageFee, defaultLateFee.minimumCharge);

        // Create late fee invoice
        const lateFeeInvoice = new Invoice({
          invoice_id: `${invoice.invoice_id}_LATE_FEE_${Date.now()}`,
          customer_name: invoice.customer_name,
          customer_id: invoice.customer_id,
          customer_email: invoice.customer_email,
          unit_number: invoice.unit_number,
          amount: parseFloat(lateFeeAmount.toFixed(2)),
          issue_date: today,
          due_date: new Date(today.getTime() + (5 * 24 * 60 * 60 * 1000)), // Due in 5 days
          status: 'pending'
        });

        await lateFeeInvoice.save();

        feesAppliedCount++;
        totalFeesAmount += lateFeeAmount;

        feeDetails.push({
          original_invoice: invoice.invoice_id,
          late_fee_invoice: lateFeeInvoice.invoice_id,
          customer_name: invoice.customer_name,
          days_overdue: daysOverdue,
          original_amount: invoice.amount,
          late_fee_amount: lateFeeAmount
        });

        console.log(`   💸 Applied late fee: ${invoice.invoice_id} → ${lateFeeInvoice.invoice_id} ($${lateFeeAmount})`);

      } catch (error) {
        console.error(`❌ Error processing late fee for invoice ${invoice.invoice_id}:`, error.message);
      }
    }

    const result = {
      processed: processedCount,
      feesApplied: feesAppliedCount,
      totalFeesAmount: parseFloat(totalFeesAmount.toFixed(2)),
      config: defaultLateFee,
      details: feeDetails
    };

    console.log(`✅ Late fees processing completed:`);
    console.log(`   📊 Processed: ${result.processed} overdue invoices`);
    console.log(`   💸 Applied fees: ${result.feesApplied} late fee invoices`);
    console.log(`   💰 Total fees: $${result.totalFeesAmount}`);

    return result;

  } catch (error) {
    console.error('❌ Fatal error in late fees processing:', error);
    throw error;
  }
};

/**
 * Get late fee statistics for reporting
 */
export const getLateFeeStats = async (days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Find all late fee invoices from the specified period
    const lateFeeInvoices = await Invoice.find({
      invoice_id: { $regex: /_LATE_FEE_/i },
      createdAt: { $gte: startDate }
    });

    const totalAmount = lateFeeInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paidFees = lateFeeInvoices.filter(inv => inv.status === 'paid');
    const paidAmount = paidFees.reduce((sum, inv) => sum + inv.amount, 0);

    return {
      period: `${days} days`,
      totalLateFees: {
        count: lateFeeInvoices.length,
        amount: parseFloat(totalAmount.toFixed(2))
      },
      paidLateFees: {
        count: paidFees.length,
        amount: parseFloat(paidAmount.toFixed(2))
      },
      collectionRate: lateFeeInvoices.length > 0 
        ? parseFloat(((paidFees.length / lateFeeInvoices.length) * 100).toFixed(1))
        : 0
    };

  } catch (error) {
    console.error('Error getting late fee stats:', error);
    throw error;
  }
};
