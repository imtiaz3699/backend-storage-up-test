import mongoose from 'mongoose';

const feeOptionsSchema = new mongoose.Schema({
  notice_trigger: {
    type: Boolean,
    default: false
  },
  fee_on_one_month: {
    type: Boolean,
    default: false
  },
  charge_is_per_unit: {
    type: Boolean,
    default: false
  },
  analysis_code: {
    type: String,
    trim: true
  }
}, { _id: false });

const invoiceFeeSchema = new mongoose.Schema({
  fee_to_charge: {
    type: Number,
    default: 0
  },
  analysis_code: {
    type: String,
    trim: true
  }
}, { _id: false });

const noticeChargeSchema = new mongoose.Schema({
  simplified_charge_system: {
    type: Boolean,
    default: false
  },
  minimum_charge: {
    type: Number,
    default: 0
  },
  minimum_percentage: {
    type: Number,
    default: 0
  },
  tiered_charge_system: {
    type: Boolean,
    default: false
  },
  fee_options: {
    type: feeOptionsSchema,
    default: () => ({})
  },
  invoice_fee: {
    type: invoiceFeeSchema,
    default: () => ({})
  }
}, {
  timestamps: true
});

const NoticeCharge = mongoose.model('NoticeCharge', noticeChargeSchema);

export default NoticeCharge;

