import mongoose from 'mongoose';

const billingPlanSchema = new mongoose.Schema({
  plan_name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be a positive number']
  },
  duration: {
    type: String,
    required: [true, 'Duration is required'],
    trim: true
  },
  features: {
    type: String,
    trim: true,
    default: ''
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const BillingPlan = mongoose.model('BillingPlan', billingPlanSchema);

export default BillingPlan;

