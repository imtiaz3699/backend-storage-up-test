import User from '../models/User.js';

export const updateProfile = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const {
      first_name,
      last_name,
      email_address,
      phoneNumber,
      address_line_one,
      address_line_two,
      city,
      state_province,
      zip_code
    } = req.body;

    // Get the current user from database
    const currentUser = await User.findById(user._id);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (first_name !== undefined) {
      currentUser.first_name = first_name;
    }
    if (last_name !== undefined) {
      currentUser.last_name = last_name;
    }
    if (email_address !== undefined) {
      // Check if email is being changed and if it's already taken
      if (email_address.toLowerCase() !== currentUser.email.toLowerCase()) {
        const existingUser = await User.findOne({ 
          email: email_address.toLowerCase() 
        });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email address is already in use'
          });
        }
        currentUser.email = email_address.toLowerCase().trim();
      }
    }
    if (phoneNumber !== undefined) {
      currentUser.phoneNumber = phoneNumber;
    }
    if (address_line_one !== undefined) {
      currentUser.address_line_one = address_line_one;
    }
    if (address_line_two !== undefined) {
      currentUser.address_line_two = address_line_two;
    }
    if (city !== undefined) {
      currentUser.city = city;
    }
    if (state_province !== undefined) {
      currentUser.state_province = state_province;
    }
    if (zip_code !== undefined) {
      currentUser.zip_code = zip_code;
    }

    // Update name if first_name or last_name are provided
    if (first_name || last_name) {
      const newName = [first_name || currentUser.first_name, last_name || currentUser.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (newName) {
        currentUser.name = newName;
      }
    }

    await currentUser.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: currentUser
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
        message: 'Email address is already in use'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

