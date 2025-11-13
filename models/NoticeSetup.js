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

const noticeSetupSchema = new mongoose.Schema({
  notice_plan_number: {
    type: Number,
    required: [true, 'Notice plan number is required']
  },
  name_of_this_notice: {
    type: String,
    required: [true, 'Name of this notice is required'],
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
  }
}, {
  timestamps: true
});

const NoticeSetup = mongoose.model('NoticeSetup', noticeSetupSchema);

export default NoticeSetup;

