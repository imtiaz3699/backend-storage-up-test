import Invoice from '../models/Invoice.js';

/**
 * Calculate invoice statistics for a user
 * @param {String} userId - MongoDB ObjectId of the user
 * @returns {Object} Invoice statistics object
 */
export const calculateInvoiceStats = async (userId) => {
  try {
    // Get all invoices for the user
    const allInvoices = await Invoice.find({ customer_id: userId }).sort({ createdAt: -1 });

    // Calculate totals
    const totalInvoices = allInvoices.length;
    
    // Calculate paid invoices - count and total amount
    const paidInvoices = allInvoices.filter(inv => inv.status === 'paid');
    const paidInvoicesCount = paidInvoices.length;
    const paidInvoicesTotal = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

    // Calculate unpaid invoices (pending status) - count and total amount
    const unpaidInvoices = allInvoices.filter(inv => inv.status === 'pending');
    const unpaidInvoicesCount = unpaidInvoices.length;
    const unpaidInvoicesTotal = unpaidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

    // Calculate overdue invoices - count and total amount
    const overdueInvoices = allInvoices.filter(inv => inv.status === 'overdue');
    const overdueInvoicesCount = overdueInvoices.length;
    const overdueInvoicesTotal = overdueInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

    // Calculate monthly invoice summary (current month)
    // Filter invoices by issue_date to get invoices issued in current month
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    currentMonthStart.setHours(0, 0, 0, 0);
    currentMonthStart.setUTCHours(0, 0, 0, 0);
    
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    currentMonthEnd.setHours(23, 59, 59, 999);
    currentMonthEnd.setUTCHours(23, 59, 59, 999);

    // Filter invoices issued in current month (based on issue_date)
    const monthlyInvoices = allInvoices.filter((inv) => {
      if (!inv.issue_date) return false;
      const issueDate = new Date(inv.issue_date);
      issueDate.setHours(0, 0, 0, 0);
      issueDate.setUTCHours(0, 0, 0, 0);
      return issueDate >= currentMonthStart && issueDate <= currentMonthEnd;
    });

    // Calculate monthly totals
    const monthlyTotalCount = monthlyInvoices.length;
    const monthlyTotalAmount = monthlyInvoices.reduce(
      (sum, inv) => sum + (inv.amount || 0),
      0
    );

    // Monthly paid invoices (count and amount)
    const monthlyPaidInvoices = monthlyInvoices.filter(inv => inv.status === 'paid');
    const monthlyPaidCount = monthlyPaidInvoices.length;
    const monthlyPaidAmount = monthlyPaidInvoices.reduce(
      (sum, inv) => sum + (inv.amount || 0),
      0
    );

    // Monthly unpaid invoices (pending status) - count and amount
    const monthlyUnpaidInvoices = monthlyInvoices.filter(inv => inv.status === 'pending');
    const monthlyUnpaidCount = monthlyUnpaidInvoices.length;
    const monthlyUnpaidAmount = monthlyUnpaidInvoices.reduce(
      (sum, inv) => sum + (inv.amount || 0),
      0
    );

    // Monthly overdue invoices - count and amount
    const monthlyOverdueInvoices = monthlyInvoices.filter(inv => inv.status === 'overdue');
    const monthlyOverdueCount = monthlyOverdueInvoices.length;
    const monthlyOverdueAmount = monthlyOverdueInvoices.reduce(
      (sum, inv) => sum + (inv.amount || 0),
      0
    );

    return {
      total_invoices: totalInvoices,
      paid_invoices: {
        count: paidInvoicesCount,
        total_amount: parseFloat(paidInvoicesTotal.toFixed(2))
      },
      unpaid_invoices: {
        count: unpaidInvoicesCount,
        total_amount: parseFloat(unpaidInvoicesTotal.toFixed(2))
      },
      overdue_invoices: {
        count: overdueInvoicesCount,
        total_amount: parseFloat(overdueInvoicesTotal.toFixed(2))
      },
      monthly_invoice_summary: {
        total: {
          count: monthlyTotalCount,
          total_amount: parseFloat(monthlyTotalAmount.toFixed(2))
        },
        paid: {
          count: monthlyPaidCount,
          total_amount: parseFloat(monthlyPaidAmount.toFixed(2))
        },
        unpaid: {
          count: monthlyUnpaidCount,
          total_amount: parseFloat(monthlyUnpaidAmount.toFixed(2))
        },
        overdue: {
          count: monthlyOverdueCount,
          total_amount: parseFloat(monthlyOverdueAmount.toFixed(2))
        },
        // Legacy fields for backward compatibility
        total_generated: parseFloat(monthlyTotalAmount.toFixed(2)),
        total_collected: parseFloat(monthlyPaidAmount.toFixed(2)),
        outstanding: parseFloat((monthlyUnpaidAmount + monthlyOverdueAmount).toFixed(2))
      }
    };
  } catch (error) {
    console.error('Error calculating invoice stats:', error);
    throw error;
  }
};

