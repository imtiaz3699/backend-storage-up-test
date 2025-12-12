import User from "../models/User.js";
import Unit from "../models/Unit.js";
import mongoose from "mongoose";

// Helper: get month range for processing date
const getMonthRange = (date) => {
  const d = new Date(date);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
};

// Helper: prorate amount over 30-day basis
const prorate = (amount, days) => {
  const daily = amount / 30;
  return Math.round(daily * days * 100) / 100;
};

// Compute rent charges for a user (no DB writes)
const computeRentChargesForUser = async (user, processingDate) => {
  const charges = [];
  if (!Array.isArray(user.rented_units) || user.rented_units.length === 0) return charges;

  const { start: monthStart, end: monthEnd } = getMonthRange(processingDate);

  for (const ru of user.rented_units) {
    if (!ru.unit_id) continue;
    const unit = await Unit.findById(ru.unit_id).lean();
    if (!unit) continue;

    const monthlyRate = unit.monthly_rate || 0;
    const ruStart = ru.start_date ? new Date(ru.start_date) : null;
    const ruEnd = ru.end_date ? new Date(ru.end_date) : null;

    // Skip if rental hasn't started by end of month
    if (ruStart && ruStart > monthEnd) continue;
    // Skip if rental ended before month starts
    if (ruEnd && ruEnd < monthStart) continue;

    // Determine charge window within month
    const chargeStart = ruStart && ruStart > monthStart ? ruStart : monthStart;
    const chargeEnd = ruEnd && ruEnd < monthEnd ? ruEnd : monthEnd;

    // days inclusive; use UTC to avoid TZ drift
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = Math.max(1, Math.floor((Date.UTC(chargeEnd.getUTCFullYear(), chargeEnd.getUTCMonth(), chargeEnd.getUTCDate()) - Date.UTC(chargeStart.getUTCFullYear(), chargeStart.getUTCMonth(), chargeStart.getUTCDate())) / msPerDay) + 1);

    const amount = (ruStart && ruStart > monthStart) || (ruEnd && ruEnd < monthEnd)
      ? prorate(monthlyRate, days)
      : monthlyRate;

    charges.push({
      user_id: user._id,
      user_name: user.name,
      unit_id: unit._id,
      unit_number: unit.unit_number || "",
      charge_type: "rent",
      monthly_rate: monthlyRate,
      prorated: amount !== monthlyRate,
      days,
      amount
    });
  }

  return charges;
};

// Preview charges (no persistence) for all users
export const previewCharges = async (req, res) => {
  try {
    let processingDate = new Date();
    if (req.query.date) {
      const d = new Date(req.query.date);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid date format. Use YYYY-MM-DD." });
      }
      processingDate = d;
    }
    processingDate.setUTCHours(0, 0, 0, 0);

    const users = await User.find({}).select("name rented_units").lean();
    const allCharges = [];

    for (const user of users) {
      const charges = await computeRentChargesForUser(user, processingDate);
      allCharges.push(...charges);
    }

    return res.status(200).json({
      success: true,
      processingDate: processingDate.toISOString().split("T")[0],
      count: allCharges.length,
      data: allCharges
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error previewing charges", error: error.message });
  }
};


