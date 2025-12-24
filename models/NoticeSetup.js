import mongoose from 'mongoose';

const noticeOptionsSchema = new mongoose.Schema({
  send_this_notice: {
    type: Boolean,
    default: false
  },
  print_this_notice: {
    type: Boolean,
    default: false
  },
  dont_need_this: {
    type: Boolean,
    default: false
  },
  only_send_one: {
    type: Boolean,
    default: false
  },
  only_send_this: {
    type: Boolean,
    default: false
  },
  bill_next_rent: {
    type: Boolean,
    default: false
  },
  dont_send_this_notice: {
    type: Boolean,
    default: false
  },
  bill_fees_only: {
    type: Boolean,
    default: false
  },
  exclude_from_late_cycle: {
    type: Boolean,
    default: false
  },
  hide_notice: {
    type: Boolean,
    default: false
  },
  use_the_days: {
    type: Boolean,
    default: false
  },
  attach_statement: {
    type: String,
    trim: true
  },
  new_attach_a_statement: {
    type: String,
    trim: true
  }
}, { _id: false });

const accessControlTriggersSchema = new mongoose.Schema({
  suspend_customer_access: {
    type: Boolean,
    default: false
  },
  flag_for_replacement: {
    type: Boolean,
    default: false
  },
  flag_for_over_lock: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const emailSchema = new mongoose.Schema({
  email_subject: {
    type: String,
    trim: true,
    default: ''
  },
  email_content: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const noticeDesignSchema = new mongoose.Schema({
  letter_content: {
    type: String,
    trim: true,
    default: ''
  },
  email: {
    type: emailSchema,
    default: () => ({})
  },
  text_message: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const simplifiedChargeSystemSchema = new mongoose.Schema({
  minimum_charge: {
    type: Number,
    default: 0
  },
  minimum_percentage: {
    type: Number,
    default: 0
  }
}, { _id: false });

const invoicingFeeSchema = new mongoose.Schema({
  fee_to_charge_customer: {
    type: Number,
    default: 0
  },
  analysis_code_to_assing: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const noticeFeeSetupSchema = new mongoose.Schema({
  simplified_charge_system: {
    type: simplifiedChargeSystemSchema,
    default: () => ({})
  },
  tiered_charge_system: {
    type: String,
    trim: true,
    default: ''
  },
  fee_options: {
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
  analysis_code_to_assign: {
    type: String,
    trim: true,
    default: ''
  },
  invoicing_fee: {
    type: invoicingFeeSchema,
    default: () => ({})
  }
}, { _id: false });

const noticeChargesSchema = new mongoose.Schema({
  notice_fee_setup: {
    type: noticeFeeSetupSchema,
    default: () => ({})
  }
}, { _id: false });

const noticeSetupSchema = new mongoose.Schema({
  // Auto-generated like NTCP__001
  notice_plan_number: {
    type: String,
    required: [true, 'Notice plan number is required'],
    unique: true,
    trim: true
  },
  name_of_this_notice: {
    type: String,
    required: [true, 'Name of this notice is required.'],
    trim: true
  },
  send_this_notice: {
    type: Number,
    required: [true, 'Send this notice is required']
  },
  before_after: {
    type: String,
    required: [true, 'Before/after is required'],
    enum: {
      values: ['before', 'after'],
      message: 'Before/after must be either "before" or "after"'
    }
  },
  late_cycle_start_date: {
    type: Date
  },
  notice_options: {
    type: noticeOptionsSchema,
    default: () => ({})
  },
  access_control_triggers: {
    type: accessControlTriggersSchema,
    default: () => ({})
  },
  notice_design: {
    type: noticeDesignSchema,
    default: () => ({})
  },
  notice_charges: {
    type: noticeChargesSchema,
    default: () => ({})
  }
}, {
  timestamps: true
});

const NoticeSetup = mongoose.model('NoticeSetup', noticeSetupSchema);

export default NoticeSetup;

