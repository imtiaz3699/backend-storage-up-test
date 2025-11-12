import mongoose from 'mongoose';

const unitDetailsSchema = new mongoose.Schema({
  unit_number: {
    type: String,
    trim: true
  },
  unit_type: {
    type: String,
    trim: true
  },
  unit_size: {
    type: String,
    trim: true
  },
  door_size: {
    type: String,
    trim: true
  },
  unit_status: {
    type: String,
    trim: true
  },
  walk_order: {
    type: String,
    trim: true
  },
  building_location: {
    type: String,
    trim: true
  }
}, { _id: false });

const dimensionsSchema = new mongoose.Schema({
  length: String,
  width: String,
  area_size: String,
  height: String
}, { _id: false });

const otherInformationSchema = new mongoose.Schema({
  creation_date: String,
  end_date: String,
  last_su_sync: String
}, { _id: false });

const unitSchema = new mongoose.Schema({
  unit_number: {
    type: String,
    required: [true, 'Unit number is required'],
    trim: true,
    unique: true
  },
  location: {
    type: String,
    trim: true,
    required: [true, 'Primary location is required']
  },
  location_two: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  unit_details: {
    type: unitDetailsSchema,
    default: () => ({})
  },
  dimensions: {
    type: dimensionsSchema,
    default: () => ({})
  },
  unit_is: {
    type: String,
    enum: ['vacant', 'rented'],
    default: 'vacant'
  },
  monthly_rate: {
    type: Number,
    default: 0,
    min: 0
  },
  other_information: {
    type: otherInformationSchema,
    default: () => ({})
  },
  maintenance_comments: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

const Unit = mongoose.model('Unit', unitSchema);

export default Unit;


