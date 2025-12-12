import User from "../../models/User.js";
import Invoice from "../../models/Invoice.js";

/**
 * Autopay Processor (placeholder without actual charging for safety)
 * - Finds users with autopay_enabled
 * - Sums pending/overdue invoices
 * - Returns counts (no real payment processing here to avoid breaking frontend)
 *
 * @param {Date} processingDate
 */
export const autopayProcessor = async (processingDate = null) => {
  const startTime = new Date();
  const processDate = processingDate || new Date();
  processDate.setUTCHours(0, 0, 0, 0);

  console.log(`🤖 Starting autopay processor at ${startTime.toISOString()}`);
  console.log(`📅 Processing date: ${processDate.toISOString().split("T")[0]}`);

  const users = await User.find({ autopay_enabled: true }).select("_id name autopay_enabled").lean();
  if (!users || users.length === 0) {
    console.log("✅ No users with autopay enabled");
    return {
      processedUsers: 0,
      attemptedCharges: 0,
      totalOutstanding: 0,
      charges: []
    };
  }

  let attemptedCharges = 0;
  let totalOutstanding = 0;
  const charges = [];

  for (const u of users) {
    // Sum pending/overdue invoices for user
    const invoices = await Invoice.find({
      customer_id: u._id,
      status: { $in: ["pending", "overdue"] }
    }).lean();

    if (!invoices || invoices.length === 0) continue;

    const outstanding = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    if (outstanding <= 0) continue;

    attemptedCharges += 1;
    totalOutstanding += outstanding;

    charges.push({
      user_id: u._id,
      user_name: u.name,
      invoice_count: invoices.length,
      amount: outstanding
    });
  }

  console.log(`🤖 Autopay summary: attempted=${attemptedCharges}, totalOutstanding=${totalOutstanding}`);

  return {
    processedUsers: users.length,
    attemptedCharges,
    totalOutstanding,
    charges
  };
};


