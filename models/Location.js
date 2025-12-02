import mongoose from 'mongoose';

const locationDetailsSchema = new mongoose.Schema({
  locationName: {
    type: String,
    required: [true, 'Location name is required'],
    trim: true
  },
  locationCode: {
    type: String,
    required: [true, 'Location code is required'],
    trim: true,
    uppercase: true,
    unique: true
  },
  emailAddress: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  manager: {
    type: String,
    trim: true
  }
}, { _id: false });

const residentialAddressSchema = new mongoose.Schema({
  addressLineOne: {
    type: String,
    required: [true, 'Address line one is required']
  },
  addressLineTwo: String,
  city: {
    type: String,
    required: [true, 'City is required']
  },
  stateProvince: {
    type: String,
    required: [true, 'State/Province is required']
  },
  zip_code: {
    type: String,
    required: [true, 'ZIP/Postal code is required']
  }
}, { _id: false });

const facilityInformationSchema = new mongoose.Schema({
  totalUnits: {
    type: Number,
    default: 0,
    min: 0
  },
  availableUnits: {
    type: Number,
    default: 0,
    min: 0
  },
  squareFoot: {
    type: String,
    trim: true
  },
  climateControl: {
    type: Boolean,
    default: false
  },
  '24_7_security': {
    type: Boolean,
    default: false
  },
  '24_7_access': {
    type: Boolean,
    default: false
  },
  parkingAvailable: {
    type: Boolean,
    default: false
  },
  loadingDock: {
    type: Boolean,
    default: false
  },
  elevatorAccess: {
    type: Boolean,
    default: false
  },
  driveUpUnits: {
    type: Boolean,
    default: false
  },
  truckRental: {
    type: Boolean,
    default: false
  },
  movingSuppliers: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const operatingHoursSchema = new mongoose.Schema({
  officeHours: String,
  accessHours: String
}, { _id: false });

const locationMapSchema = new mongoose.Schema({
  name: {
    type: String
  },
  address: {
    type: String
  },
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const locationSchema = new mongoose.Schema({
  locationDetails: {
    type: locationDetailsSchema,
    required: true
  },
  locationStatus: {
    type: String,
    enum: ['active', 'inactive', 'underMaintenance'],
    default: 'active'
  },
  residentialAddress: {
    type: residentialAddressSchema,
    required: true
  },
  locationMap: {
    type: locationMapSchema
  },
  facilityInformation: {
    type: facilityInformationSchema,
    default: () => ({})
  },
  operatingHours: {
    type: operatingHoursSchema,
    default: () => ({})
  },
  locationImages: {
    type: [String],
    default: []
  },
  area: {
    type: String,
    enum: ['North', 'South'],
    default: null,
    trim: true
  }
}, {
  timestamps: true
});

const Location = mongoose.model('Location', locationSchema);

export default Location;


