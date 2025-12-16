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
    transaction_id: {
      type: String,
      trim: true,
      unique: true,
      uppercase: true,
    },
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
    },
    // Payment transaction fields
    payment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null
    },
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null
    },
    amount: {
      type: Number,
      default: null,
      min: 0
    },
    transaction_type: {
      type: String,
      enum: ['payment', 'move_out_notice'],
      default: 'move_out_notice'
    }
  },
  {
    timestamps: true,
  }
);

// Auto-generate transaction_id if not provided
transactionSchema.pre("save", async function (next) {
  if (!this.transaction_id || this.transaction_id.trim() === "") {
    try {
      // Find the last transaction with the highest number
      const TransactionModel = this.constructor;
      const lastTransaction = await TransactionModel.findOne(
        { transaction_id: { $regex: /^TXN-\d+$/ } },
        {},
        { sort: { transaction_id: -1 } }
      );

      let nextNumber = 1;
      if (lastTransaction && lastTransaction.transaction_id) {
        // Extract the number from the last transaction_id (e.g., "TXN-89342" -> 89342)
        const match = lastTransaction.transaction_id.match(/^TXN-(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Format as TXN-XXXXX (5 digits)
      this.transaction_id = `TXN-${String(nextNumber).padStart(5, "0")}`;
    } catch (error) {
      return next(error);
    }
  } else {
    // Ensure transaction_id is uppercase
    this.transaction_id = this.transaction_id.toUpperCase().trim();
  }
  next();
});

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;

