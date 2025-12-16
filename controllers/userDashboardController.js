import User from '../models/User.js';
import Unit from '../models/Unit.js';
import { getDefaultDummyUnits, createDefaultUnitsForUser } from '../utils/unitHelpers.js';

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

export const getUserDashboard = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Pagination parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Find ONLY units rented to THIS specific user
    // Filters by: customer_email matches user's email AND unit_is is 'rented'
    const userEmail = user.email.toLowerCase().trim();
    
    // Get total count and paginated units from Unit collection
    let [totalUnits, rentedUnits] = await Promise.all([
      Unit.countDocuments({
        customer_email: userEmail,
        unit_is: 'rented'
      }),
      Unit.find({
        customer_email: userEmail,
        unit_is: 'rented'
      })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
    ]);

    // Also check user's rented_units array for actual unit references
    const userWithRentedUnits = await User.findById(user._id)
      .select('rented_units')
      .populate('rented_units.unit_id');
    
    const userRentedUnitsCount = userWithRentedUnits?.rented_units?.filter(
      ru => ru.unit_id && !ru.unit_id.sample
    ).length || 0;

    // Check if user has ANY actual rented units (either in Unit collection or in rented_units array)
    let hasActualRentedUnits = totalUnits > 0 || userRentedUnitsCount > 0;

    // If user has no rented units, create default units in the database
    if (!hasActualRentedUnits && totalUnits === 0 && (!userWithRentedUnits?.rented_units || userWithRentedUnits.rented_units.length === 0)) {
      try {
        const fullUser = await User.findById(user._id);
        await createDefaultUnitsForUser(fullUser);
        // Reload units after creating
        const updatedTotal = await Unit.countDocuments({
          customer_email: userEmail,
          unit_is: 'rented'
        });
        hasActualRentedUnits = updatedTotal > 0;
      } catch (error) {
        console.error(`Error creating default units for user ${user._id}:`, error);
        // Continue without throwing - will show dummy units as fallback
      }
    }

    // Re-fetch units if default units were created
    let allRentedUnits = await Unit.find({
      customer_email: userEmail,
      unit_is: 'rented'
    }).sort({ createdAt: -1 });

    // Re-fetch paginated units if default units were created
    if (hasActualRentedUnits && allRentedUnits.length > 0) {
      rentedUnits = await Unit.find({
        customer_email: userEmail,
        unit_is: 'rented'
      })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
    }

    // Only show dummy units if user has NO actual rented units
    let unitsToDisplay = rentedUnits;
    if (!hasActualRentedUnits && allRentedUnits.length === 0) {
      const defaultUnits = getDefaultDummyUnits(user);
      unitsToDisplay = defaultUnits.slice(skip, skip + limit);
      allRentedUnits = defaultUnits;
    }

    const totalMonthlyCost = allRentedUnits.reduce((sum, unit) => {
      return sum + (unit.monthly_rate || 0);
    }, 0);

    // Calculate total square feet
    const totalSquareFeet = allRentedUnits.reduce((sum, unit) => {
      const areaSize = unit.dimensions?.area_size;
      if (areaSize) {
        // Extract number from area_size string (e.g., "100FQ" -> 100, "100.5" -> 100.5)
        const match = String(areaSize).match(/(\d+\.?\d*)/);
        if (match) {
          const value = parseFloat(match[1]);
          if (!isNaN(value)) {
            return sum + value;
          }
        }
      }
      return sum;
    }, 0);

    // Prepare user data (without sensitive information)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      roles: user.roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // Calculate totals using allRentedUnits (which may include dummy units)
    const finalTotalUnits = allRentedUnits.length;
    const finalTotalMonthlyCost = allRentedUnits.reduce((sum, unit) => {
      return sum + (unit.monthly_rate || 0);
    }, 0);

    const finalTotalSquareFeet = allRentedUnits.reduce((sum, unit) => {
      const areaSize = unit.dimensions?.area_size;
      if (areaSize) {
        // Extract number from area_size string (e.g., "100FQ" -> 100, "100.5" -> 100.5)
        const match = String(areaSize).match(/(\d+\.?\d*)/);
        if (match) {
          const value = parseFloat(match[1]);
          if (!isNaN(value)) {
            return sum + value;
          }
        }
      }
      return sum;
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        user: userData,
        summary: {
          totalUnits: finalTotalUnits,
          totalMonthlyCost: finalTotalMonthlyCost,
          totalSquareFeet: parseFloat(finalTotalSquareFeet.toFixed(2))
        },
        units: unitsToDisplay,
        pagination: buildPagination(page, limit, finalTotalUnits)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user dashboard data',
      error: error.message
    });
  }
};

