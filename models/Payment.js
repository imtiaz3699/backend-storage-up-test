import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: [true, "Invoice ID is required"],
      index: true,
    },
    invoice_number: {
      type: String,
      trim: true,
      uppercase: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer ID is required"],
      index: true,
    },
    customer_name: {
      type: String,
      trim: true,
    },
    customer_email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount must be a positive number"],
    },
    currency: {
      type: String,
      default: "usd",
      uppercase: true,
    },
    // Stripe payment fields
    stripe_checkout_session_id: {
      type: String,
      trim: true,
      index: true,
    },
    stripe_payment_intent_id: {
      type: String,
      trim: true,
      required: [true, "Stripe payment intent ID is required"],
      unique: true,
      index: true,
    },
    stripe_payment_status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "canceled"],
      default: "pending",
    },
    paid_at: {
      type: Date,
      default: Date.now,
    },
    payment_method_type: {
      type: String,
      default: "card",
    },
    // Optional: Store Stripe payment method details
    payment_method_id: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
paymentSchema.index({ customer_id: 1, paid_at: -1 });
paymentSchema.index({ invoice_id: 1 });
paymentSchema.index({ stripe_payment_intent_id: 1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;

