import mongoose from "mongoose";

const runLogSchema = new mongoose.Schema(
  {
    processingDate: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["in_progress", "success", "failed"],
      default: "in_progress",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
    jobs: {
      type: Object,
      default: {},
    },
    message: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// One log per date
runLogSchema.index({ processingDate: 1 }, { unique: true });

const RunLog = mongoose.model("RunLog", runLogSchema);

export default RunLog;


