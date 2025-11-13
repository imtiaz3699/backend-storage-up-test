import Invoice from "../models/Invoice.js";

const buildPagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit) || 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    limit,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

export const getUserInvoices = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Pagination parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Match invoices by customer_email (preferred) or customer_name
    const userEmail = user.email.toLowerCase().trim();
    const userName = user.name.trim();

    // Get total count and paginated invoices
    const query = {
      $or: [{ customer_email: userEmail }, { customer_name: userName }]
    };

    const [totalCount, paginatedInvoices] = await Promise.all([
      Invoice.countDocuments(query),
      Invoice.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
    ]);

    // Get all invoices for calculations (not paginated)
    const allInvoices = await Invoice.find(query).sort({ createdAt: -1 });

    // Calculate invoice counts
    const totalInvoices = allInvoices.length;
    const paidInvoices = allInvoices.filter(
      (inv) => inv.status === "paid"
    ).length;
    const unpaidInvoices = allInvoices.filter(
      (inv) => inv.status === "pending"
    ).length;
    const overdueInvoices = allInvoices.filter(
      (inv) => inv.status === "overdue"
    ).length;

    // Calculate monthly invoice summary (current month)
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const monthlyInvoices = allInvoices.filter((inv) => {
      const issueDate = new Date(inv.issue_date);
      return issueDate >= currentMonthStart && issueDate <= currentMonthEnd;
    });

    const totalGenerated = monthlyInvoices.reduce(
      (sum, inv) => sum + (inv.amount || 0),
      0
    );
    const totalCollected = monthlyInvoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const outstanding = monthlyInvoices
      .filter((inv) => inv.status !== "paid" && inv.status !== "cancelled")
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        total_invoices: totalInvoices,
        paid_invoices: paidInvoices,
        un_paid_invoices: unpaidInvoices,
        over_due_invoices: overdueInvoices,
        monthly_invoice_summary: {
          total_generated: totalGenerated,
          total_collected: totalCollected,
          outstanding: outstanding,
        },
        invoices: paginatedInvoices,
        pagination: buildPagination(page, limit, totalCount)
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user invoices",
      error: error.message,
    });
  }
};
