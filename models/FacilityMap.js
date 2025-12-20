import mongoose from 'mongoose';

// Schema for unit layouts (only stores position/size data, unit data comes from Unit Management API)
const unitLayoutSchema = new mongoose.Schema({
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: [true, 'Unit ID is required']
  },
  x: {
    type: Number,
    required: [true, 'X coordinate is required'],
    default: 0
  },
  y: {
    type: Number,
    required: [true, 'Y coordinate is required'],
    default: 0
  },
  width: {
    type: Number,
    required: [true, 'Width is required'],
    min: [1, 'Width must be greater than 0']
  },
  height: {
    type: Number,
    required: [true, 'Height is required'],
    min: [1, 'Height must be greater than 0']
  }
}, { _id: false });

// Schema for custom shapes (user-added elements)
const customShapeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'Shape ID is required'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Shape type is required'],
    enum: ['text', 'rect', 'circle', 'ellipse', 'line', 'image'],
    trim: true
  },
  x: {
    type: Number,
    required: [true, 'X coordinate is required'],
    default: 0
  },
  y: {
    type: Number,
    required: [true, 'Y coordinate is required'],
    default: 0
  },
  width: {
    type: Number,
    default: 0
  },
  height: {
    type: Number,
    default: 0
  },
  // Optional properties for different shape types
  fill: {
    type: String,
    default: null
  },
  stroke: {
    type: String,
    default: null
  },
  strokeWidth: {
    type: Number,
    default: 1
  },
  text: {
    type: String,
    default: null
  },
  fontSize: {
    type: Number,
    default: 12
  },
  fontFamily: {
    type: String,
    default: 'Arial'
  },
  src: {
    type: String, // For images - can be URL or base64
    default: null
  },
  rotation: {
    type: Number,
    default: 0
  },
  opacity: {
    type: Number,
    default: 1,
    min: 0,
    max: 1
  },
  // Additional properties stored as mixed type
  properties: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

// Main Facility Map Schema (singleton - only one map exists in the app)
const facilityMapSchema = new mongoose.Schema({
  // Unit layouts: maps unitId to position/size on the map
  // Unit data (status, number, etc.) comes from Unit Management API
  unitLayouts: {
    type: [unitLayoutSchema],
    default: []
  },
  customShapes: {
    type: [customShapeSchema],
    default: []
  },
  bgImageSrc: {
    type: String,
    default: null,
    trim: true
  },
  // Canvas settings (optional)
  canvasSettings: {
    scale: {
      type: Number,
      default: 1
    },
    rotation: {
      type: Number,
      default: 0
    },
    fontSize: {
      type: Number,
      default: 12
    }
  },
  // Metadata
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Index for faster queries
facilityMapSchema.index({ createdAt: -1 });
facilityMapSchema.index({ updatedAt: -1 });

// Method to get map summary (optional helper)
facilityMapSchema.methods.getSummary = function() {
  return {
    unitLayoutsCount: this.unitLayouts.length,
    customShapesCount: this.customShapes.length,
    hasBackground: !!this.bgImageSrc,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const FacilityMap = mongoose.model('FacilityMap', facilityMapSchema);

export default FacilityMap;

