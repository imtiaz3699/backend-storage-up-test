import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoice_id: {
      type: String,
      trim: true,
      unique: true,
      uppercase: true,
    },
    customer_name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    customer_email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    unit_number: {
      type: [String],
      required: [true, "Unit number is required"],
      validate: {
        validator: function(v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one unit number is required"
      }
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount must be a positive number"],
    },
    issue_date: {
      type: Date,
      required: [true, "Issue date is required"],
    },
    due_date: {
      type: Date,
      required: [true, "Due date is required"],
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      trim: true,
      enum: {
        values: ["pending", "paid", "overdue", "cancelled"],
        message: "Status must be one of: pending, paid, overdue, cancelled",
      },
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate invoice_id if not provided
invoiceSchema.pre("save", async function (next) {
  if (!this.invoice_id || this.invoice_id.trim() === "") {
    try {
      // Find the last invoice with the highest number
      const InvoiceModel = this.constructor;
      const lastInvoice = await InvoiceModel.findOne(
        { invoice_id: { $regex: /^INV_\d+$/ } },
        {},
        { sort: { invoice_id: -1 } }
      );

      let nextNumber = 1;
      if (lastInvoice && lastInvoice.invoice_id) {
        // Extract the number from the last invoice_id (e.g., "INV_001" -> 1)
        const match = lastInvoice.invoice_id.match(/^INV_(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Format as INV_XXX with leading zeros (3 digits)
      this.invoice_id = `INV_${String(nextNumber).padStart(3, "0")}`;
    } catch (error) {
      return next(error);
    }
  } else {
    // Ensure invoice_id is uppercase
    this.invoice_id = this.invoice_id.toUpperCase().trim();
  }
  next();
});

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
