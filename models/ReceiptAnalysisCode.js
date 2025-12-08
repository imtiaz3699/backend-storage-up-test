import mongoose from 'mongoose';

const analysisCodeOptionsSchema = new mongoose.Schema({
  use_this_code_as: {
    type: Boolean,
    default: false
  },
  set_banked_date: {
    type: Boolean,
    default: false
  },
  include_in_banking: {
    type: Boolean,
    default: false
  },
  dont_export_to_accounting: {
    type: Boolean,
    default: false
  },
  dont_show_on_banking: {
    type: Boolean,
    default: false
  },
  show_as_other_regular: {
    type: Boolean,
    default: false
  },
  show_code: {
    type: String,
    trim: true
  },
  special_options: {
    type: String,
    trim: true
  }
}, { _id: false });

const receiptAnalysisCodeSchema = new mongoose.Schema({
  analysis_code: {
    type: String,
    required: [true, 'Analysis code is required'],
    trim: true,
    uppercase: true,
    unique: true
  },
  sort_order: {
    type: Number,
    default: 0
  },
  gl_acct_code: {
    type: String,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true
  },
  analysis_code_options: {
    type: analysisCodeOptionsSchema,
    default: () => ({})
  }
}, {
  timestamps: true
});

const ReceiptAnalysisCode = mongoose.model('ReceiptAnalysisCode', receiptAnalysisCodeSchema);

export default ReceiptAnalysisCode;

