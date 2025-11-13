import mongoose from 'mongoose';

const paymentMethodSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  stripe_payment_method_id: {
    type: String,
    required: [true, 'Stripe payment method ID is required'],
    trim: true
  },
  stripe_customer_id: {
    type: String,
    trim: true
  },
  card_brand: {
    type: String,
    trim: true
  },
  card_last4: {
    type: String,
    trim: true
  },
  card_exp_month: {
    type: Number
  },
  card_exp_year: {
    type: Number
  },
  card_holder_name: {
    type: String,
    trim: true
  },
  is_default: {
    type: Boolean,
    default: false
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure one default payment method per user
paymentMethodSchema.pre('save', async function(next) {
  if (this.is_default && this.isModified('is_default')) {
    // Set all other payment methods for this user to not default
    await mongoose.model('PaymentMethod').updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { is_default: false }
    );
  }
  next();
});

const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);

export default PaymentMethod;

