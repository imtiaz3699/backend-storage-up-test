import mongoose from "mongoose";

const moveOutNoticeGiveSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: null
  },
  balance_owning: {
    type: Number,
    default: 0,
    min: 0
  },
  other_charges: {
    type: String,
    trim: true,
    default: ''
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { _id: false });

const actualMoveOutNoticeSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: null
  },
  reverse_deposit: {
    type: Number,
    default: 0,
    min: 0
  },
  final_amount_owed: {
    type: Number,
    default: 0
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { _id: false });

const transactionSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending'
    },
    move_out_notice_give: {
      type: moveOutNoticeGiveSchema,
      default: null
    },
    actual_move_out_notice: {
      type: actualMoveOutNoticeSchema,
      default: null
    }
  },
  {
    timestamps: true,
  }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;

