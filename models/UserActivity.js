import mongoose from "mongoose";

const userActivitySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String, // e.g., "2025-12-11"
      trim: true,
    },
    time: {
      type: String, // e.g., "10:05:23"
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    action: {
      type: String,
      required: true, // e.g., "login", "signup", "logout", "reset_password"
      trim: true,
    },
  },
  {
    timestamps: true, // createdAt and updatedAt
  }
);

const UserActivity = mongoose.model("UserActivity", userActivitySchema);

export default UserActivity;

