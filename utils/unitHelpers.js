import Unit from '../models/Unit.js';
import User from '../models/User.js';

/**
 * Generate 5 default dummy units for display when user has no units
 * These are sample/non-persisted units (similar to how transactions work)
 * @param {Object} user - User object to get user info for dummy units
 * @returns {Array} Array of 5 dummy unit objects
 */
export const getDefaultDummyUnits = (user) => {
  const now = new Date();
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const twoMonthsFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  return [
    {
      _id: '64f1f77bcf86cd7994392001',
      unit_number: 'UNIT-101',
      location: 'Main Warehouse - Building A',
      location_two: 'Floor 1',
      description: 'Climate Controlled Storage Unit',
      unit_details: {
        unit_number: 'UNIT-101',
        unit_type: 'Climate Controlled',
        unit_size: '10x10',
        door_size: 'Standard',
        unit_status: 'Rented',
        walk_order: 'A-101',
        building_location: 'Building A, Floor 1'
      },
      dimensions: {
        length: '10',
        width: '10',
        area_size: '100',
        height: '8'
      },
      unit_is: 'rented',
      customer_email: user?.email?.toLowerCase() || '',
      monthly_rate: 150.00,
      other_information: {
        creation_date: threeMonthsAgo.toISOString().split('T')[0],
        end_date: '',
        last_su_sync: ''
      },
      maintenance_comments: 'Unit in good condition',
      createdAt: threeMonthsAgo.toISOString(),
      updatedAt: now.toISOString(),
      sample: true
    },
    {
      _id: '64f1f77bcf86cd7994392002',
      unit_number: 'UNIT-205',
      location: 'Main Warehouse - Building B',
      location_two: 'Floor 2',
      description: 'Standard Storage Unit',
      unit_details: {
        unit_number: 'UNIT-205',
        unit_type: 'Standard',
        unit_size: '5x10',
        door_size: 'Standard',
        unit_status: 'Rented',
        walk_order: 'B-205',
        building_location: 'Building B, Floor 2'
      },
      dimensions: {
        length: '5',
        width: '10',
        area_size: '50',
        height: '8'
      },
      unit_is: 'rented',
      customer_email: user?.email?.toLowerCase() || '',
      monthly_rate: 75.00,
      other_information: {
        creation_date: threeMonthsAgo.toISOString().split('T')[0],
        end_date: '',
        last_su_sync: ''
      },
      maintenance_comments: '',
      createdAt: threeMonthsAgo.toISOString(),
      updatedAt: now.toISOString(),
      sample: true
    },
    {
      _id: '64f1f77bcf86cd7994392003',
      unit_number: 'UNIT-310',
      location: 'Main Warehouse - Building C',
      location_two: 'Floor 3',
      description: 'Large Storage Unit',
      unit_details: {
        unit_number: 'UNIT-310',
        unit_type: 'Large',
        unit_size: '10x20',
        door_size: 'Wide',
        unit_status: 'Rented',
        walk_order: 'C-310',
        building_location: 'Building C, Floor 3'
      },
      dimensions: {
        length: '10',
        width: '20',
        area_size: '200',
        height: '10'
      },
      unit_is: 'rented',
      customer_email: user?.email?.toLowerCase() || '',
      monthly_rate: 250.00,
      other_information: {
        creation_date: threeMonthsAgo.toISOString().split('T')[0],
        end_date: '',
        last_su_sync: ''
      },
      maintenance_comments: 'Recently inspected',
      createdAt: threeMonthsAgo.toISOString(),
      updatedAt: now.toISOString(),
      sample: true
    },
    {
      _id: '64f1f77bcf86cd7994392004',
      unit_number: 'UNIT-401',
      location: 'Main Warehouse - Building A',
      location_two: 'Floor 4',
      description: 'Medium Storage Unit',
      unit_details: {
        unit_number: 'UNIT-401',
        unit_type: 'Standard',
        unit_size: '8x10',
        door_size: 'Standard',
        unit_status: 'Rented',
        walk_order: 'A-401',
        building_location: 'Building A, Floor 4'
      },
      dimensions: {
        length: '8',
        width: '10',
        area_size: '80',
        height: '8'
      },
      unit_is: 'rented',
      customer_email: user?.email?.toLowerCase() || '',
      monthly_rate: 120.00,
      other_information: {
        creation_date: threeMonthsAgo.toISOString().split('T')[0],
        end_date: '',
        last_su_sync: ''
      },
      maintenance_comments: '',
      createdAt: threeMonthsAgo.toISOString(),
      updatedAt: now.toISOString(),
      sample: true
    },
    {
      _id: '64f1f77bcf86cd7994392005',
      unit_number: 'UNIT-502',
      location: 'Main Warehouse - Building B',
      location_two: 'Floor 5',
      description: 'Small Storage Unit',
      unit_details: {
        unit_number: 'UNIT-502',
        unit_type: 'Small',
        unit_size: '5x5',
        door_size: 'Standard',
        unit_status: 'Rented',
        walk_order: 'B-502',
        building_location: 'Building B, Floor 5'
      },
      dimensions: {
        length: '5',
        width: '5',
        area_size: '25',
        height: '8'
      },
      unit_is: 'rented',
      customer_email: user?.email?.toLowerCase() || '',
      monthly_rate: 50.00,
      other_information: {
        creation_date: threeMonthsAgo.toISOString().split('T')[0],
        end_date: '',
        last_su_sync: ''
      },
      maintenance_comments: 'Compact unit, ideal for documents',
      createdAt: threeMonthsAgo.toISOString(),
      updatedAt: now.toISOString(),
      sample: true
    }
  ];
};

/**
 * Create 5 default units in the database and add them to user's rented_units array
 * Uses exact Unit model schema key-value pairs as defined in models/Unit.js
 * @param {Object} user - User object (must be a Mongoose document)
 * @returns {Promise<Object>} Object with created count and unit IDs
 */
export const createDefaultUnitsForUser = async (user) => {
  try {
    // Check if user already has rented units
    if (user.rented_units && user.rented_units.length > 0) {
      // Check if any of the rented units are actual units (not dummy)
      const userWithPopulated = await User.findById(user._id)
        .populate('rented_units.unit_id')
        .select('rented_units');
      
      const hasActualUnits = userWithPopulated?.rented_units?.some(
        ru => ru.unit_id && !ru.unit_id.sample
      );

      // Also check Unit collection
      const userEmail = user.email.toLowerCase().trim();
      const unitCount = await Unit.countDocuments({
        customer_email: userEmail,
        unit_is: 'rented'
      });

      if (hasActualUnits || unitCount > 0) {
        return { created: 0, message: 'User already has rented units' };
      }
    }

    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Create unique unit numbers using user ID (first 8 chars)
    const userIdPrefix = user._id.toString().substring(0, 8);
    
    const defaultUnitsData = [
      {
        unit_number: `UNIT-${userIdPrefix}-101`,
        location: 'Main Warehouse - Building A',
        location_two: 'Floor 1',
        description: 'Climate Controlled Storage Unit',
        unit_details: {
          unit_number: `UNIT-${userIdPrefix}-101`,
          unit_type: 'Climate Controlled',
          unit_size: '10x10',
          door_size: 'Standard',
          unit_status: 'Rented',
          walk_order: 'A-101',
          building_location: 'Building A, Floor 1'
        },
        dimensions: {
          length: '10',
          width: '10',
          area_size: '100',
          height: '8'
        },
        unit_is: 'rented',
        customer_email: user.email.toLowerCase().trim(),
        monthly_rate: 150.00,
        other_information: {
          creation_date: threeMonthsAgo.toISOString().split('T')[0],
          end_date: '',
          last_su_sync: ''
        },
        maintenance_comments: 'Unit in good condition'
      },
      {
        unit_number: `UNIT-${userIdPrefix}-205`,
        location: 'Main Warehouse - Building B',
        location_two: 'Floor 2',
        description: 'Standard Storage Unit',
        unit_details: {
          unit_number: `UNIT-${userIdPrefix}-205`,
          unit_type: 'Standard',
          unit_size: '5x10',
          door_size: 'Standard',
          unit_status: 'Rented',
          walk_order: 'B-205',
          building_location: 'Building B, Floor 2'
        },
        dimensions: {
          length: '5',
          width: '10',
          area_size: '50',
          height: '8'
        },
        unit_is: 'rented',
        customer_email: user.email.toLowerCase().trim(),
        monthly_rate: 75.00,
        other_information: {
          creation_date: threeMonthsAgo.toISOString().split('T')[0],
          end_date: '',
          last_su_sync: ''
        },
        maintenance_comments: ''
      },
      {
        unit_number: `UNIT-${userIdPrefix}-310`,
        location: 'Main Warehouse - Building C',
        location_two: 'Floor 3',
        description: 'Large Storage Unit',
        unit_details: {
          unit_number: `UNIT-${userIdPrefix}-310`,
          unit_type: 'Large',
          unit_size: '10x20',
          door_size: 'Wide',
          unit_status: 'Rented',
          walk_order: 'C-310',
          building_location: 'Building C, Floor 3'
        },
        dimensions: {
          length: '10',
          width: '20',
          area_size: '200',
          height: '10'
        },
        unit_is: 'rented',
        customer_email: user.email.toLowerCase().trim(),
        monthly_rate: 250.00,
        other_information: {
          creation_date: threeMonthsAgo.toISOString().split('T')[0],
          end_date: '',
          last_su_sync: ''
        },
        maintenance_comments: 'Recently inspected'
      },
      {
        unit_number: `UNIT-${userIdPrefix}-401`,
        location: 'Main Warehouse - Building A',
        location_two: 'Floor 4',
        description: 'Medium Storage Unit',
        unit_details: {
          unit_number: `UNIT-${userIdPrefix}-401`,
          unit_type: 'Standard',
          unit_size: '8x10',
          door_size: 'Standard',
          unit_status: 'Rented',
          walk_order: 'A-401',
          building_location: 'Building A, Floor 4'
        },
        dimensions: {
          length: '8',
          width: '10',
          area_size: '80',
          height: '8'
        },
        unit_is: 'rented',
        customer_email: user.email.toLowerCase().trim(),
        monthly_rate: 120.00,
        other_information: {
          creation_date: threeMonthsAgo.toISOString().split('T')[0],
          end_date: '',
          last_su_sync: ''
        },
        maintenance_comments: ''
      },
      {
        unit_number: `UNIT-${userIdPrefix}-502`,
        location: 'Main Warehouse - Building B',
        location_two: 'Floor 5',
        description: 'Small Storage Unit',
        unit_details: {
          unit_number: `UNIT-${userIdPrefix}-502`,
          unit_type: 'Small',
          unit_size: '5x5',
          door_size: 'Standard',
          unit_status: 'Rented',
          walk_order: 'B-502',
          building_location: 'Building B, Floor 5'
        },
        dimensions: {
          length: '5',
          width: '5',
          area_size: '25',
          height: '8'
        },
        unit_is: 'rented',
        customer_email: user.email.toLowerCase().trim(),
        monthly_rate: 50.00,
        other_information: {
          creation_date: threeMonthsAgo.toISOString().split('T')[0],
          end_date: '',
          last_su_sync: ''
        },
        maintenance_comments: 'Compact unit, ideal for documents'
      }
    ];

    // Create Unit documents in the database
    const createdUnits = [];
    for (const unitData of defaultUnitsData) {
      const unit = new Unit(unitData);
      await unit.save();
      createdUnits.push(unit);
    }

    // Add units to user's rented_units array with all Unit model fields
    const rentedUnitsData = createdUnits.map((unit, index) => ({
      unit_id: unit._id,
      // All Unit model fields
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
      maintenance_comments: unit.maintenance_comments,
      // Rented unit specific fields
      billing_cycle: 'monthly',
      deposit_amount: unit.monthly_rate * 2, // 2 months deposit
      start_date: threeMonthsAgo,
      end_date: index < 2 ? oneMonthFromNow : null // First 2 units have end dates
    }));

    // Initialize rented_units if it doesn't exist
    if (!user.rented_units) {
      user.rented_units = [];
    }

    // Add the new units to the user's rented_units array
    user.rented_units.push(...rentedUnitsData);
    await user.save();

    return { 
      created: createdUnits.length, 
      units: createdUnits.map(u => u._id),
      message: 'Default units created and added to user successfully'
    };
  } catch (error) {
    console.error(`Error creating default units for user ${user._id}:`, error);
    throw error;
  }
};

