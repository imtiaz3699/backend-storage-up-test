// Daily Financial Summary Job
import Invoice from '../../models/Invoice.js';
import Unit from '../../models/Unit.js';
import User from '../../models/User.js';
import { sendEmail } from '../../utils/emailService.js';

/**
 * Daily job to generate and send financial summary report
 * Runs at 11:00 PM daily to summarize the day's financial activity
 * @param {Date} processingDate - Optional date to process for (defaults to today)
 */
export const dailyFinancialSummary = async (processingDate = null) => {
  const startTime = new Date();
  const processDate = processingDate || new Date();
  processDate.setHours(0, 0, 0, 0);
  
  console.log(`📊 Starting daily financial summary at ${startTime.toISOString()}`);
  console.log(`📅 Processing date: ${processDate.toISOString().split('T')[0]}`);

  try {
    const today = processDate;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Generate comprehensive financial report
    const summary = await generateFinancialSummary(today, tomorrow);
    
    // Send email report to admin if enabled
    const sendEmailReport = process.env.DAILY_FINANCIAL_REPORT_EMAIL === 'true';
    const adminEmails = (process.env.ADMIN_EMAIL_RECIPIENTS || '').split(',').filter(email => email.trim());

    if (sendEmailReport && adminEmails.length > 0) {
      try {
        const emailContent = generateFinancialReportEmail(summary, today);
        
        await sendEmail({
          to: adminEmails.join(','),
          subject: `Daily Financial Summary - ${today.toLocaleDateString()}`,
          text: emailContent.text,
          html: emailContent.html
        });

        console.log(`📧 Financial report sent to ${adminEmails.length} admin(s)`);
      } catch (emailError) {
        console.error('❌ Failed to send financial report email:', emailError.message);
      }
    }

    console.log(`✅ Daily financial summary completed:`);
    console.log(`   💰 Today's Revenue: $${summary.todayRevenue.total}`);
    console.log(`   📊 Total Outstanding: $${summary.accountsReceivable.total}`);
    console.log(`   🏢 Occupancy Rate: ${summary.occupancy.rate}%`);

    return summary;

  } catch (error) {
    console.error('❌ Fatal error in daily financial summary:', error);
    throw error;
  }
};

/**
 * Generate comprehensive financial summary data
 */
const generateFinancialSummary = async (startDate, endDate) => {
  try {
    // 1. Today's Revenue (Paid Invoices)
    const todayPaidInvoices = await Invoice.find({
      status: 'paid',
      updatedAt: { $gte: startDate, $lt: endDate }
    });

    const todayRevenue = {
      count: todayPaidInvoices.length,
      total: parseFloat(todayPaidInvoices.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)),
      regular: 0,
      lateFees: 0
    };

    // Separate regular payments from late fees
    todayPaidInvoices.forEach(invoice => {
      if (invoice.invoice_id.includes('_LATE_FEE_')) {
        todayRevenue.lateFees += invoice.amount;
      } else {
        todayRevenue.regular += invoice.amount;
      }
    });

    todayRevenue.regular = parseFloat(todayRevenue.regular.toFixed(2));
    todayRevenue.lateFees = parseFloat(todayRevenue.lateFees.toFixed(2));

    // 2. Today's New Invoices
    const todayNewInvoices = await Invoice.find({
      createdAt: { $gte: startDate, $lt: endDate }
    });

    const newInvoices = {
      count: todayNewInvoices.length,
      total: parseFloat(todayNewInvoices.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)),
      regular: todayNewInvoices.filter(inv => !inv.invoice_id.includes('_LATE_FEE_')).length,
      lateFees: todayNewInvoices.filter(inv => inv.invoice_id.includes('_LATE_FEE_')).length
    };

    // 3. Accounts Receivable (Outstanding)
    const outstandingInvoices = await Invoice.find({
      status: { $in: ['pending', 'overdue'] }
    });

    const accountsReceivable = {
      total: parseFloat(outstandingInvoices.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)),
      pending: {
        count: outstandingInvoices.filter(inv => inv.status === 'pending').length,
        amount: parseFloat(outstandingInvoices
          .filter(inv => inv.status === 'pending')
          .reduce((sum, inv) => sum + inv.amount, 0).toFixed(2))
      },
      overdue: {
        count: outstandingInvoices.filter(inv => inv.status === 'overdue').length,
        amount: parseFloat(outstandingInvoices
          .filter(inv => inv.status === 'overdue')
          .reduce((sum, inv) => sum + inv.amount, 0).toFixed(2))
      }
    };

    // 4. Occupancy Statistics
    const totalUnits = await Unit.countDocuments();
    const rentedUnits = await Unit.countDocuments({ unit_is: 'rented' });
    const vacantUnits = totalUnits - rentedUnits;

    const occupancy = {
      total: totalUnits,
      rented: rentedUnits,
      vacant: vacantUnits,
      rate: totalUnits > 0 ? parseFloat(((rentedUnits / totalUnits) * 100).toFixed(1)) : 0
    };

    // 5. Monthly Metrics (Current Month)
    const monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyPaidInvoices = await Invoice.find({
      status: 'paid',
      updatedAt: { $gte: monthStart, $lte: monthEnd }
    });

    const monthlyRevenue = {
      total: parseFloat(monthlyPaidInvoices.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)),
      count: monthlyPaidInvoices.length,
      averagePerDay: 0
    };

    const daysInMonth = Math.floor((endDate - monthStart) / (1000 * 60 * 60 * 24));
    if (daysInMonth > 0) {
      monthlyRevenue.averagePerDay = parseFloat((monthlyRevenue.total / daysInMonth).toFixed(2));
    }

    // 6. Customer Metrics
    const totalCustomers = await User.countDocuments({ roles: 'user' });
    const activeCustomers = await User.countDocuments({
      roles: 'user',
      'rented_units.0': { $exists: true }
    });

    const customerMetrics = {
      total: totalCustomers,
      active: activeCustomers,
      inactive: totalCustomers - activeCustomers
    };

    // 7. Payment Performance
    const last30Days = new Date(startDate);
    last30Days.setDate(last30Days.getDate() - 30);

    const recentInvoices = await Invoice.find({
      createdAt: { $gte: last30Days }
    });

    const recentPaid = recentInvoices.filter(inv => inv.status === 'paid').length;
    const paymentRate = recentInvoices.length > 0 
      ? parseFloat(((recentPaid / recentInvoices.length) * 100).toFixed(1))
      : 0;

    const performance = {
      totalInvoicesLast30Days: recentInvoices.length,
      paidInvoicesLast30Days: recentPaid,
      paymentRate: paymentRate
    };

    return {
      date: startDate.toDateString(),
      generated: new Date().toISOString(),
      todayRevenue,
      newInvoices,
      accountsReceivable,
      occupancy,
      monthlyRevenue,
      customerMetrics,
      performance
    };

  } catch (error) {
    console.error('Error generating financial summary:', error);
    throw error;
  }
};

/**
 * Generate email content for financial report
 */
const generateFinancialReportEmail = (summary, reportDate) => {
  const subject = `Daily Financial Summary - ${reportDate.toLocaleDateString()}`;
  
  // Text version
  const text = `
DAILY FINANCIAL SUMMARY
${reportDate.toLocaleDateString()}

TODAY'S REVENUE
- Total Revenue: $${summary.todayRevenue.total}
- Regular Payments: $${summary.todayRevenue.regular} (${summary.todayRevenue.count - (summary.todayRevenue.lateFees > 0 ? 1 : 0)} invoices)
- Late Fees: $${summary.todayRevenue.lateFees}

NEW INVOICES ISSUED TODAY
- Count: ${summary.newInvoices.count}
- Total Amount: $${summary.newInvoices.total}
- Regular: ${summary.newInvoices.regular}
- Late Fees: ${summary.newInvoices.lateFees}

ACCOUNTS RECEIVABLE
- Total Outstanding: $${summary.accountsReceivable.total}
- Pending: $${summary.accountsReceivable.pending.amount} (${summary.accountsReceivable.pending.count} invoices)
- Overdue: $${summary.accountsReceivable.overdue.amount} (${summary.accountsReceivable.overdue.count} invoices)

OCCUPANCY
- Total Units: ${summary.occupancy.total}
- Rented: ${summary.occupancy.rented}
- Vacant: ${summary.occupancy.vacant}
- Occupancy Rate: ${summary.occupancy.rate}%

MONTHLY PERFORMANCE
- Month-to-Date Revenue: $${summary.monthlyRevenue.total}
- Average Daily Revenue: $${summary.monthlyRevenue.averagePerDay}

CUSTOMER METRICS
- Total Customers: ${summary.customerMetrics.total}
- Active Customers: ${summary.customerMetrics.active}
- Payment Rate (30 days): ${summary.performance.paymentRate}%

Report generated: ${summary.generated}
  `.trim();

  // HTML version
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #1f2937; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">📊 Daily Financial Summary</h2>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">${reportDate.toLocaleDateString()}</p>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
        
        <!-- Today's Revenue -->
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #0c5460;">💰 Today's Revenue</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #bee5eb;"><strong>Total Revenue:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #bee5eb; font-size: 1.3em; font-weight: bold; color: #155724;">$${summary.todayRevenue.total}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #bee5eb;">Regular Payments:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #bee5eb;">$${summary.todayRevenue.regular}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;">Late Fees:</td>
                    <td style="padding: 8px 0;">$${summary.todayRevenue.lateFees}</td>
                </tr>
            </table>
        </div>

        <!-- New Invoices -->
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #856404;">📋 New Invoices Issued</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ffeaa7;">Total Count:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ffeaa7; font-weight: bold;">${summary.newInvoices.count}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ffeaa7;">Total Amount:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ffeaa7; font-weight: bold;">$${summary.newInvoices.total}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;">Regular: ${summary.newInvoices.regular} | Late Fees: ${summary.newInvoices.lateFees}</td>
                    <td style="padding: 8px 0;"></td>
                </tr>
            </table>
        </div>

        <!-- Accounts Receivable -->
        <div style="background-color: ${summary.accountsReceivable.overdue.amount > 0 ? '#f8d7da' : '#d4edda'}; border: 1px solid ${summary.accountsReceivable.overdue.amount > 0 ? '#f5c6cb' : '#c3e6cb'}; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: ${summary.accountsReceivable.overdue.amount > 0 ? '#721c24' : '#155724'};">🏦 Accounts Receivable</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ccc;"><strong>Total Outstanding:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ccc; font-size: 1.2em; font-weight: bold;">$${summary.accountsReceivable.total}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ccc;">Pending:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ccc;">$${summary.accountsReceivable.pending.amount} (${summary.accountsReceivable.pending.count} invoices)</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;">Overdue:</td>
                    <td style="padding: 8px 0; ${summary.accountsReceivable.overdue.amount > 0 ? 'color: #721c24; font-weight: bold;' : ''}">$${summary.accountsReceivable.overdue.amount} (${summary.accountsReceivable.overdue.count} invoices)</td>
                </tr>
            </table>
        </div>

        <!-- Occupancy -->
        <div style="background-color: #e2e3e5; border: 1px solid #d6d8db; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #383d41;">🏢 Occupancy</h3>
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <div style="flex: 1;">
                    <div style="background-color: #28a745; height: 20px; width: ${summary.occupancy.rate}%; border-radius: 10px; display: inline-block;"></div>
                    <div style="background-color: #dc3545; height: 20px; width: ${100 - summary.occupancy.rate}%; border-radius: 10px; display: inline-block;"></div>
                </div>
                <div style="margin-left: 15px; font-size: 1.2em; font-weight: bold;">${summary.occupancy.rate}%</div>
            </div>
            <p style="margin: 0;">Rented: ${summary.occupancy.rented} | Vacant: ${summary.occupancy.vacant} | Total: ${summary.occupancy.total}</p>
        </div>

        <!-- Performance Summary -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <div style="flex: 1; background-color: white; border: 1px solid #dee2e6; border-radius: 5px; padding: 15px;">
                <h4 style="margin-top: 0; color: #495057;">Monthly Revenue</h4>
                <p style="font-size: 1.1em; font-weight: bold; color: #28a745; margin: 0;">$${summary.monthlyRevenue.total}</p>
                <small>Avg/Day: $${summary.monthlyRevenue.averagePerDay}</small>
            </div>
            <div style="flex: 1; background-color: white; border: 1px solid #dee2e6; border-radius: 5px; padding: 15px;">
                <h4 style="margin-top: 0; color: #495057;">Payment Rate</h4>
                <p style="font-size: 1.1em; font-weight: bold; color: ${summary.performance.paymentRate >= 80 ? '#28a745' : summary.performance.paymentRate >= 60 ? '#ffc107' : '#dc3545'}; margin: 0;">${summary.performance.paymentRate}%</p>
                <small>Last 30 days</small>
            </div>
        </div>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
        
        <p style="font-size: 0.9em; color: #6c757d;">
            Report generated: ${summary.generated}<br>
            <strong>StorageUp Management System</strong>
        </p>
    </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
};

/**
 * Get financial summary for any date range (for admin dashboard)
 */
export const getFinancialSummary = async (startDate, endDate) => {
  try {
    return await generateFinancialSummary(startDate, endDate);
  } catch (error) {
    console.error('Error getting financial summary:', error);
    throw error;
  }
};
