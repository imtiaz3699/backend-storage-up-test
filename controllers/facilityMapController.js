import FacilityMap from '../models/FacilityMap.js';
import Unit from '../models/Unit.js';
import mongoose from 'mongoose';

/**
 * Get the facility map (singleton - only one map exists in the app)
 * Returns the saved map design with unitLayouts (merged with unit data), customShapes, and bgImageSrc
 */
export const getFacilityMap = async (req, res) => {
  try {
    // Get the single facility map (no filter needed since only one exists)
    const facilityMap = await FacilityMap.findOne().populate('created_by', 'name email').populate('updated_by', 'name email');

    // Get ALL units from the database
    const allUnits = await Unit.find({}).lean();

    // Create a map of unitId -> layout data from saved facility map (for quick lookup)
    const layoutMap = new Map();
    if (facilityMap && facilityMap.unitLayouts) {
      facilityMap.unitLayouts.forEach(layout => {
        layoutMap.set(layout.unitId.toString(), {
          x: layout.x,
          y: layout.y,
          width: layout.width,
          height: layout.height
        });
      });
    }

    // Helper function to parse dimension string (e.g., "10ft" -> 10)
    const parseDimension = (dimensionString) => {
      if (!dimensionString || typeof dimensionString !== 'string') {
        return null;
      }
      // Extract numeric value from strings like "10ft", "10 ft", "10", etc.
      const match = dimensionString.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : null;
    };

    // Build unitLayouts array with ALL units from database
    // If a unit has saved layout data, use it; otherwise, use dimensions as defaults
    const unitLayoutsWithData = allUnits.map(unit => {
      const unitIdString = unit._id.toString();
      const savedLayout = layoutMap.get(unitIdString);

      // Extract default width/height from unit dimensions if no saved layout
      let defaultWidth = null;
      let defaultHeight = null;
      if (!savedLayout && unit.dimensions) {
        // Parse width from dimensions.width (e.g., "10ft" -> 10)
        if (unit.dimensions.width) {
          defaultWidth = parseDimension(unit.dimensions.width);
        }
        
        // Parse height from dimensions.length (e.g., "10ft" -> 10)
        // Use length as the primary source for map height, fallback to height field if needed
        if (unit.dimensions.length) {
          defaultHeight = parseDimension(unit.dimensions.length);
        } else if (unit.dimensions.height) {
          defaultHeight = parseDimension(unit.dimensions.height);
        }
      }

      return {
        unitId: unit._id,
        x: savedLayout ? savedLayout.x : 0, // Default to 0 if no saved position
        y: savedLayout ? savedLayout.y : 0, // Default to 0 if no saved position
        width: savedLayout ? savedLayout.width : (defaultWidth || 100), // Use saved width, or parsed dimension, or default 100
        height: savedLayout ? savedLayout.height : (defaultHeight || 100), // Use saved height, or parsed dimension, or default 100
        unit: {
          _id: unit._id,
          unit_number: unit.unit_number,
          location: unit.location,
          location_two: unit.location_two,
          description: unit.description,
          unit_details: unit.unit_details,
          dimensions: unit.dimensions,
          unit_is: unit.unit_is,
          customer_email: unit.customer_email,
          monthly_rate: unit.monthly_rate,
          other_information: unit.other_information,
          maintenance_comments: unit.maintenance_comments
        }
      };
    });

    // Return saved map data with ALL units from database
    res.status(200).json({
      success: true,
      message: 'Facility map retrieved successfully',
      data: {
        unitLayouts: unitLayoutsWithData,
        customShapes: facilityMap ? (facilityMap.customShapes || []) : [],
        bgImageSrc: facilityMap ? (facilityMap.bgImageSrc || null) : null,
        canvasSettings: facilityMap && facilityMap.canvasSettings ? facilityMap.canvasSettings : {
          scale: 1,
          rotation: 0,
          fontSize: 12
        },
        created_by: facilityMap && facilityMap.created_by ? {
          name: facilityMap.created_by.name,
          email: facilityMap.created_by.email
        } : null,
        updated_by: facilityMap && facilityMap.updated_by ? {
          name: facilityMap.updated_by.name,
          email: facilityMap.updated_by.email
        } : null,
        createdAt: facilityMap ? facilityMap.createdAt : null,
        updatedAt: facilityMap ? facilityMap.updatedAt : null,
        exists: !!facilityMap
      }
    });
  } catch (error) {
    console.error('Error getting facility map:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving facility map',
      error: error.message
    });
  }
};

/**
 * Save or update facility map (singleton - only one map exists in the app)
 * Upserts the map design (creates if doesn't exist, updates if exists)
 */
export const saveFacilityMap = async (req, res) => {
  try {
    const { unitLayouts, customShapes, bgImageSrc, canvasSettings } = req.body;
    const userId = req.userId; // From tokenMiddleware

    // Validate unitLayouts array
    if (unitLayouts !== undefined && !Array.isArray(unitLayouts)) {
      return res.status(400).json({
        success: false,
        message: 'unitLayouts must be an array'
      });
    }

    // Validate customShapes array
    if (customShapes !== undefined && !Array.isArray(customShapes)) {
      return res.status(400).json({
        success: false,
        message: 'customShapes must be an array'
      });
    }

    // Validate unitLayouts structure if provided
    if (unitLayouts && unitLayouts.length > 0) {
      for (let i = 0; i < unitLayouts.length; i++) {
        const layout = unitLayouts[i];
        
        // Validate unitId (must be valid ObjectId)
        if (!layout.unitId || !mongoose.Types.ObjectId.isValid(layout.unitId)) {
          return res.status(400).json({
            success: false,
            message: `unitLayouts[${i}].unitId is required and must be a valid MongoDB ObjectId`
          });
        }

        // Verify unit exists
        const unitExists = await Unit.findById(layout.unitId);
        if (!unitExists) {
          return res.status(400).json({
            success: false,
            message: `unitLayouts[${i}].unitId references a unit that does not exist`
          });
        }

        // Validate coordinates and dimensions
        if (typeof layout.x !== 'number' || typeof layout.y !== 'number') {
          return res.status(400).json({
            success: false,
            message: `unitLayouts[${i}].x and unitLayouts[${i}].y must be numbers`
          });
        }
        if (typeof layout.width !== 'number' || layout.width <= 0) {
          return res.status(400).json({
            success: false,
            message: `unitLayouts[${i}].width must be a positive number`
          });
        }
        if (typeof layout.height !== 'number' || layout.height <= 0) {
          return res.status(400).json({
            success: false,
            message: `unitLayouts[${i}].height must be a positive number`
          });
        }
      }
    }

    // Validate customShapes structure if provided
    if (customShapes && customShapes.length > 0) {
      const validTypes = ['text', 'rect', 'circle', 'ellipse', 'line', 'image'];
      for (let i = 0; i < customShapes.length; i++) {
        const shape = customShapes[i];
        if (!shape.id || typeof shape.id !== 'string') {
          return res.status(400).json({
            success: false,
            message: `customShapes[${i}].id is required and must be a string`
          });
        }
        if (!shape.type || !validTypes.includes(shape.type)) {
          return res.status(400).json({
            success: false,
            message: `customShapes[${i}].type is required and must be one of: ${validTypes.join(', ')}`
          });
        }
        if (typeof shape.x !== 'number' || typeof shape.y !== 'number') {
          return res.status(400).json({
            success: false,
            message: `customShapes[${i}].x and customShapes[${i}].y must be numbers`
          });
        }
      }
    }

    // Validate bgImageSrc
    if (bgImageSrc !== undefined && bgImageSrc !== null && typeof bgImageSrc !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'bgImageSrc must be a string or null'
      });
    }

    // Validate canvasSettings if provided
    if (canvasSettings && typeof canvasSettings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'canvasSettings must be an object'
      });
    }

    // Prepare update data
    const updateData = {
      updated_by: userId
    };

    if (unitLayouts !== undefined) {
      updateData.unitLayouts = unitLayouts;
    }
    if (customShapes !== undefined) {
      updateData.customShapes = customShapes;
    }
    if (bgImageSrc !== undefined) {
      updateData.bgImageSrc = bgImageSrc;
    }
    if (canvasSettings !== undefined) {
      updateData.canvasSettings = canvasSettings;
    }

    // Check if map exists
    let facilityMap = await FacilityMap.findOne();

    if (facilityMap) {
      // Update existing map
      facilityMap = await FacilityMap.findOneAndUpdate(
        {},
        { $set: updateData },
        {
          new: true, // Return updated document
          runValidators: true // Run schema validators
        }
      );
    } else {
      // Create new map (first time)
      updateData.created_by = userId;
      facilityMap = await FacilityMap.create(updateData);
    }

    res.status(200).json({
      success: true,
      message: 'Facility map saved successfully',
      data: {
        unitLayouts: facilityMap.unitLayouts || [],
        customShapes: facilityMap.customShapes || [],
        bgImageSrc: facilityMap.bgImageSrc || null,
        canvasSettings: facilityMap.canvasSettings || {
          scale: 1,
          rotation: 0,
          fontSize: 12
        },
        createdAt: facilityMap.createdAt,
        updatedAt: facilityMap.updatedAt
      }
    });
  } catch (error) {
    console.error('Error saving facility map:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Facility map with this ID already exists (should not happen with upsert)'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error saving facility map',
      error: error.message
    });
  }
};

/**
 * Update a single unit's position/layout on the facility map
 * This allows updating just one unit's x, y, width, height without sending the entire map
 */
export const updateUnitLayout = async (req, res) => {
  try {
    const { unitId, x, y, width, height } = req.body;
    const userId = req.userId; // From tokenMiddleware

    // Validate required fields
    if (!unitId) {
      return res.status(400).json({
        success: false,
        message: 'unitId is required'
      });
    }

    // Validate unitId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(unitId)) {
      return res.status(400).json({
        success: false,
        message: 'unitId must be a valid MongoDB ObjectId'
      });
    }

    // Verify unit exists
    const unitExists = await Unit.findById(unitId);
    if (!unitExists) {
      return res.status(400).json({
        success: false,
        message: 'Unit not found'
      });
    }

    // Validate coordinates and dimensions
    if (x !== undefined && (typeof x !== 'number')) {
      return res.status(400).json({
        success: false,
        message: 'x must be a number'
      });
    }

    if (y !== undefined && (typeof y !== 'number')) {
      return res.status(400).json({
        success: false,
        message: 'y must be a number'
      });
    }

    if (width !== undefined && (typeof width !== 'number' || width <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'width must be a positive number'
      });
    }

    if (height !== undefined && (typeof height !== 'number' || height <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'height must be a positive number'
      });
    }

    // Get or create the facility map
    let facilityMap = await FacilityMap.findOne();

    if (!facilityMap) {
      // Create new map if it doesn't exist
      facilityMap = await FacilityMap.create({
        unitLayouts: [],
        updated_by: userId,
        created_by: userId
      });
    }

    // Find existing layout for this unit
    const unitLayoutIndex = facilityMap.unitLayouts.findIndex(
      layout => layout.unitId.toString() === unitId
    );

    // Prepare the layout data
    const layoutData = {
      unitId: new mongoose.Types.ObjectId(unitId),
      x: x !== undefined ? x : (facilityMap.unitLayouts[unitLayoutIndex]?.x ?? 0),
      y: y !== undefined ? y : (facilityMap.unitLayouts[unitLayoutIndex]?.y ?? 0),
      width: width !== undefined ? width : (facilityMap.unitLayouts[unitLayoutIndex]?.width ?? 100),
      height: height !== undefined ? height : (facilityMap.unitLayouts[unitLayoutIndex]?.height ?? 100)
    };

    if (unitLayoutIndex >= 0) {
      // Update existing layout
      facilityMap.unitLayouts[unitLayoutIndex] = layoutData;
    } else {
      // Add new layout
      facilityMap.unitLayouts.push(layoutData);
    }

    facilityMap.updated_by = userId;
    await facilityMap.save();

    res.status(200).json({
      success: true,
      message: 'Unit layout updated successfully',
      data: {
        unitId: unitId,
        x: layoutData.x,
        y: layoutData.y,
        width: layoutData.width,
        height: layoutData.height
      }
    });
  } catch (error) {
    console.error('Error updating unit layout:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating unit layout',
      error: error.message
    });
  }
};

/**
 * Delete facility map (singleton - only one map exists in the app)
 */
export const deleteFacilityMap = async (req, res) => {
  try {
    const facilityMap = await FacilityMap.findOneAndDelete({});

    if (!facilityMap) {
      return res.status(404).json({
        success: false,
        message: 'Facility map not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Facility map deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting facility map:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting facility map',
      error: error.message
    });
  }
};


