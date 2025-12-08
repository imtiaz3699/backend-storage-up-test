import mongoose from 'mongoose';

const unitTypeSizeSchema = new mongoose.Schema({
  length: {
    type: Number,
    default: 0
  },
  width: {
    type: Number,
    default: 0
  },
  area_size: {
    type: Number,
    default: 0
  },
  height: {
    type: Number,
    default: 0
  },
  length_is_variable: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const unitTypeConfigurationSchema = new mongoose.Schema({
  type_code: {
    type: String,
    trim: true
  },
  sort_order: {
    type: Number,
    default: 0
  },
  deposit: {
    type: Number,
    default: 0
  },
  monthly_rate: {
    type: Number,
    default: 0
  },
  weekly_rate: {
    type: Number,
    default: 0
  },
  daily_rate: {
    type: Number,
    default: 0
  },
  unit_type_and_size: {
    type: unitTypeSizeSchema,
    default: () => ({})
  }
}, { _id: false });

const assignmentsSchema = new mongoose.Schema({
  billing_plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingPlan',
  },
  rental_analysis_code: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RentalAnalysisCode',
    trim: true
  },
  organization_analysis_code: {
    type: String,
    trim: true
  }
}, { _id: false });

const unitTypeStatisticsSchema = new mongoose.Schema({
  total_units_of_this_type: {
    type: Number,
    default: 0,
    min: 0
  },
  occupied_units_of_this_type: {
    type: Number,
    default: 0,
    min: 0
  },
  vacant_units_of_this_type: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

const unitTypeSchema = new mongoose.Schema({
  type_code: {
    type: String,
    required: [true, 'Type code is required'],
    trim: true,
    uppercase: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  unit_type_configuration: {
    type: unitTypeConfigurationSchema,
    default: () => ({})
  },
  assignments: {
    type: assignmentsSchema,
    default: () => ({})
  },
  unit_type_statistics: {
    type: unitTypeStatisticsSchema,
    default: () => ({})
  }
}, {
  timestamps: true
});

const UnitType = mongoose.model('UnitType', unitTypeSchema);

export default UnitType;


