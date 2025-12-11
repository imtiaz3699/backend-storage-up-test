import UserActivity from "../models/UserActivity.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// Create activity (for any user) - protected
export const createActivity = async (req, res) => {
  try {
    const { user_id, date, time, location, action } = req.body;

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ success: false, message: "Valid user_id is required" });
    }
    if (!action || typeof action !== "string") {
      return res.status(400).json({ success: false, message: "action is required" });
    }

    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const activity = await UserActivity.create({
      user_id,
      date: date || new Date().toISOString().split("T")[0],
      time: time || new Date().toISOString().split("T")[1].split(".")[0],
      location: location || "",
      action: action.trim(),
    });

    res.status(201).json({ success: true, data: activity });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating activity", error: error.message });
  }
};

// Get activity for current user (self)
export const getMyActivity = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    let activities = await UserActivity.find({ user_id: userId }).sort({ createdAt: -1 }).limit(100);

    // Seed with sample data if none exist (for integration/demo)
    if (!activities || activities.length === 0) {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const time = now.toISOString().split("T")[1].split(".")[0];

      await UserActivity.insertMany([
        {
          user_id: userId,
          date: today,
          time,
          location: "Sample City, US",
          action: "login"
        },
        {
          user_id: userId,
          date: today,
          time,
          location: "Sample City, US",
          action: "forgot_password"
        },
        {
          user_id: userId,
          date: today,
          time,
          location: "Sample City, US",
          action: "logout"
        }
      ]);

      activities = await UserActivity.find({ user_id: userId }).sort({ createdAt: -1 }).limit(100);
    }

    res.status(200).json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching activity", error: error.message });
  }
};

// Get activity for a specific user (self or admin)
export const getUserActivityById = async (req, res) => {
  try {
    const requester = req.user;
    const targetUserId = req.params.userId;

    if (!requester?._id) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, message: "Invalid userId" });
    }

    const isAdmin = requester.roles?.includes('admin') || requester.roles?.includes('moderator');
    const isSelf = requester._id.toString() === targetUserId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { page = 1, limit = 100 } = req.query;
    const p = parseInt(page, 10) || 1;
    const l = Math.min(parseInt(limit, 10) || 100, 200); // cap
    const skip = (p - 1) * l;

    const [total, activities] = await Promise.all([
      UserActivity.countDocuments({ user_id: targetUserId }),
      UserActivity.find({ user_id: targetUserId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        currentPage: p,
        totalItems: total,
        totalPages: Math.ceil(total / l) || 1,
        limit: l
      },
      data: activities
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching activity", error: error.message });
  }
};

// Get activity (admin) with optional filters
export const getActivity = async (req, res) => {
  try {
    const { user_id, action, startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (user_id) {
      if (!mongoose.Types.ObjectId.isValid(user_id)) {
        return res.status(400).json({ success: false, message: "Invalid user_id" });
      }
      filter.user_id = user_id;
    }
    if (action) {
      filter.action = { $regex: action, $options: "i" };
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const p = parseInt(page, 10) || 1;
    const l = parseInt(limit, 10) || 50;
    const skip = (p - 1) * l;

    const [total, activities] = await Promise.all([
      UserActivity.countDocuments(filter),
      UserActivity.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        currentPage: p,
        totalItems: total,
        totalPages: Math.ceil(total / l) || 1,
        limit: l,
      },
      data: activities,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching activity", error: error.message });
  }
};

