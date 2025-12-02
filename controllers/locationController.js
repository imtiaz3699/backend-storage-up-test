import Location from '../models/Location.js';
import { getLocationImageUrl } from '../middleware/uploadMiddleware.js';

// Helper to build pagination metadata
const buildPagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit) || 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    limit,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

export const createLocation = async (req, res) => {
  try {
    // Parse JSON strings from form data
    const locationData = { ...req.body };

    // Parse nested JSON strings if they exist
    if (typeof locationData.locationDetails === 'string') {
      locationData.locationDetails = JSON.parse(locationData.locationDetails);
    }
    if (typeof locationData.residentialAddress === 'string') {
      locationData.residentialAddress = JSON.parse(locationData.residentialAddress);
    }
    if (typeof locationData.facilityInformation === 'string') {
      locationData.facilityInformation = JSON.parse(locationData.facilityInformation);
    }
    if (typeof locationData.operatingHours === 'string') {
      locationData.operatingHours = JSON.parse(locationData.operatingHours);
    }
    if (typeof locationData.locationMap === 'string') {
      // If locationMap is a string, try to parse it, otherwise set to null
      try {
        locationData.locationMap = JSON.parse(locationData.locationMap);
      } catch (e) {
        // If it's not valid JSON and not empty, set to null
        locationData.locationMap = locationData.locationMap.trim() ? null : undefined;
      }
    }

    // Handle uploaded location images
    if (req.files && req.files.length > 0) {
      const imageUrls = req.files.map(file => getLocationImageUrl(file.filename));
      // If locationImages already exists (from form data), merge with uploaded images
      if (locationData.locationImages) {
        const existingImages = typeof locationData.locationImages === 'string' 
          ? JSON.parse(locationData.locationImages) 
          : Array.isArray(locationData.locationImages) 
            ? locationData.locationImages 
            : [];
        locationData.locationImages = [...existingImages, ...imageUrls];
      } else {
        locationData.locationImages = imageUrls;
      }
    } else if (typeof locationData.locationImages === 'string') {
      // If locationImages is a JSON string, parse it
      try {
        locationData.locationImages = JSON.parse(locationData.locationImages);
      } catch (e) {
        locationData.locationImages = [];
      }
    }

    const location = await Location.create(locationData);

    res.status(201).json({
      success: true,
      message: 'Location created successfully',
      data: location
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Location code must be unique'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating location',
      error: error.message
    });
  }
};

export const getLocations = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    // Filter by city name
    if (req.query.city) {
      filter['residentialAddress.city'] = { $regex: req.query.city, $options: 'i' };
    }

    // Filter by area - default to 'North' if no area is provided
    if (req.query.area) {
      filter.area = req.query.area;
    } else {
      // Default to 'North' if no area filter is provided (including null/empty areas)
      filter.$or = [
        { area: 'North' },
        { area: null },
        { area: '' }
      ];
    }

    const [total, locations] = await Promise.all([
      Location.countDocuments(filter),
      Location.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
    ]);

    res.status(200).json({
      success: true,
      count: locations.length,
      pagination: buildPagination(page, limit, total),
      data: locations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching locations',
      error: error.message
    });
  }
};

export const getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid location ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching location',
      error: error.message
    });
  }
};

export const updateLocation = async (req, res) => {
  try {
    // Parse JSON strings from form data
    const locationData = { ...req.body };

    // Parse nested JSON strings if they exist
    if (typeof locationData.locationDetails === 'string') {
      locationData.locationDetails = JSON.parse(locationData.locationDetails);
    }
    if (typeof locationData.residentialAddress === 'string') {
      locationData.residentialAddress = JSON.parse(locationData.residentialAddress);
    }
    if (typeof locationData.facilityInformation === 'string') {
      locationData.facilityInformation = JSON.parse(locationData.facilityInformation);
    }
    if (typeof locationData.operatingHours === 'string') {
      locationData.operatingHours = JSON.parse(locationData.operatingHours);
    }
    if (typeof locationData.locationMap === 'string') {
      // If locationMap is a string, try to parse it, otherwise set to null
      try {
        locationData.locationMap = JSON.parse(locationData.locationMap);
      } catch (e) {
        // If it's not valid JSON and not empty, set to null
        locationData.locationMap = locationData.locationMap.trim() ? null : undefined;
      }
    }

    // Handle uploaded location images
    if (req.files && req.files.length > 0) {
      const imageUrls = req.files.map(file => getLocationImageUrl(file.filename));
      // If locationImages already exists (from form data), merge with uploaded images
      if (locationData.locationImages) {
        const existingImages = typeof locationData.locationImages === 'string' 
          ? JSON.parse(locationData.locationImages) 
          : Array.isArray(locationData.locationImages) 
            ? locationData.locationImages 
            : [];
        locationData.locationImages = [...existingImages, ...imageUrls];
      } else {
        locationData.locationImages = imageUrls;
      }
    } else if (typeof locationData.locationImages === 'string') {
      // If locationImages is a JSON string, parse it
      try {
        locationData.locationImages = JSON.parse(locationData.locationImages);
      } catch (e) {
        locationData.locationImages = [];
      }
    }

    const location = await Location.findByIdAndUpdate(
      req.params.id,
      locationData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: location
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid location ID'
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Location code must be unique'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: error.message
    });
  }
};

export const deleteLocation = async (req, res) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Location deleted successfully',
      data: {}
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid location ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting location',
      error: error.message
    });
  }
};


