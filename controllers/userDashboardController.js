import User from '../models/User.js';
import Unit from '../models/Unit.js';

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
    
    // Get total count and paginated units
    const [totalUnits, rentedUnits] = await Promise.all([
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

    // Calculate totals from ALL rented units (not just paginated ones)
    // We need to fetch all units for accurate totals
    const allRentedUnits = await Unit.find({
      customer_email: userEmail,
      unit_is: 'rented'
    });

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

    res.status(200).json({
      success: true,
      data: {
        user: userData,
        summary: {
          totalUnits: totalUnits,
          totalMonthlyCost: totalMonthlyCost,
          totalSquareFeet: parseFloat(totalSquareFeet.toFixed(2))
        },
        units: rentedUnits,
        pagination: buildPagination(page, limit, totalUnits)
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

