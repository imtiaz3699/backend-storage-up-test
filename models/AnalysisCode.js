import mongoose from 'mongoose';

const analysisCodeOptionsSchema = new mongoose.Schema({
  use_this_code: {
    type: Boolean,
    default: false
  },
  available_for_sales: {
    type: Boolean,
    default: false
  },
  taxable: {
    type: Boolean,
    default: false
  },
  bill_on_move_in: {
    type: Boolean,
    default: false
  },
  bill_on_move_out: {
    type: Boolean,
    default: false
  },
  show_as_other_regular_charges: {
    type: Boolean,
    default: false
  },
  show_code: {
    type: String,
    trim: true
  },
  everywhere: {
    type: String,
    trim: true
  },
  keys_stats_category: {
    type: String,
    trim: true
  },
  analysis_category: {
    type: String,
    trim: true
  },
  special_options: {
    type: String,
    trim: true
  }
}, { _id: false });

const analysisCodeSetupSchema = new mongoose.Schema({
  default_sell_amount: {
    type: Number,
    default: 0
  },
  minimum_sell_amount: {
    type: Number,
    default: 0
  },
  maximum_sell_amount: {
    type: Number,
    default: 0
  },
  credit_percentage: {
    type: Number,
    default: 0
  },
  standard_code_price: {
    type: Number,
    default: 0
  }
}, { _id: false });

const stockControlSettingsSchema = new mongoose.Schema({
  enable_online: {
    type: Boolean,
    default: false
  },
  enable_stock_control: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const analysisCodeSchema = new mongoose.Schema({
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
  },
  analysis_code_setup: {
    type: analysisCodeSetupSchema,
    default: () => ({})
  },
  stock_control_settings: {
    type: stockControlSettingsSchema,
    default: () => ({})
  }
}, {
  timestamps: true
});

const AnalysisCode = mongoose.model('AnalysisCode', analysisCodeSchema);

export default AnalysisCode;


