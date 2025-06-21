const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Institute = require('../models/Institute'); // Adjust path as needed
const auth = require('../middleware/auth'); // Adjust path as needed

// @route   POST /api/institutes/register
// @desc    Register a new institute
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      type,
      email,
      password,
      contactNumber,
      address,
      establishedYear,
      website
    } = req.body;

    // Check if institute already exists
    const existingInstitute = await Institute.findOne({ email });
    if (existingInstitute) {
      return res.status(400).json({
        success: false,
        message: 'Institute with this email already exists'
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create new institute
    const institute = new Institute({
      name,
      type,
      email,
      password,
      contactNumber,
      address,
      establishedYear,
      website,
      verificationToken
    });

    await institute.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: institute._id, email: institute.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Institute registered successfully',
      data: {
        institute,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
});

// @route   POST /api/institutes/login
// @desc    Login institute
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if institute exists
    const institute = await Institute.findOne({ email }).select('+password');
    if (!institute) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if institute is active
    if (!institute.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isMatch = await institute.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: institute._id, email: institute.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        institute,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
});

// @route   GET /api/institutes/profile
// @desc    Get current institute profile
// @access  Private
router.get('/profile', auth.authenticateInstitute, async (req, res) => {
  try {
    const institute = await Institute.findById(req.user.id);
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    res.json({
      success: true,
      data: institute
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/institutes/profile
// @desc    Update institute profile
// @access  Private
router.put('/profile', auth.authenticateInstitute, async (req, res) => {
  try {
    const updateFields = { ...req.body };
    
    // Remove fields that shouldn't be updated directly
    delete updateFields.password;
    delete updateFields.email;
    delete updateFields.verificationToken;
    delete updateFields.resetPasswordToken;
    delete updateFields.resetPasswordExpires;

    const institute = await Institute.findByIdAndUpdate(
      req.user.id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: institute
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
});

// @route   PUT /api/institutes/change-password
// @desc    Change institute password
// @access  Private
router.put('/change-password', auth.authenticateInstitute, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    const institute = await Institute.findById(req.user.id).select('+password');
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    // Verify current password
    const isMatch = await institute.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    institute.password = newPassword;
    await institute.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/institutes/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const institute = await Institute.findOne({ email });
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found with this email'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    institute.resetPasswordToken = resetToken;
    institute.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await institute.save();

    // Here you would typically send an email with the reset link
    // For now, we'll just return the token (remove this in production)
    res.json({
      success: true,
      message: 'Password reset token generated',
      resetToken // Remove this in production
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/institutes/reset-password
// @desc    Reset password using token
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const institute = await Institute.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!institute) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password and clear reset fields
    institute.password = newPassword;
    institute.resetPasswordToken = undefined;
    institute.resetPasswordExpires = undefined;

    await institute.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/institutes/verify
// @desc    Verify institute account
// @access  Public
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    const institute = await Institute.findOne({ verificationToken: token });
    if (!institute) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    institute.isVerified = true;
    institute.verificationToken = undefined;
    await institute.save();

    res.json({
      success: true,
      message: 'Account verified successfully'
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/institutes/subscription
// @desc    Update subscription
// @access  Private
router.put('/subscription', auth.authenticateInstitute, async (req, res) => {
  try {
    const { plan, endDate } = req.body;

    const institute = await Institute.findByIdAndUpdate(
      req.user.id,
      {
        'subscription.plan': plan,
        'subscription.endDate': endDate,
        'subscription.isActive': true
      },
      { new: true }
    );

    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: institute
    });
  } catch (error) {
    console.error('Subscription update error:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating subscription',
      error: error.message
    });
  }
});

// @route   GET /api/institutes/all
// @desc    Get all institutes (admin only)
// @access  Private
router.get('/all', auth.authenticateInstitute, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.isVerified !== undefined) filter.isVerified = req.query.isVerified === 'true';

    const institutes = await Institute.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Institute.countDocuments(filter);

    res.json({
      success: true,
      data: {
        institutes,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get all institutes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/institutes/:id
// @desc    Delete institute (admin only)
// @access  Private
router.delete('/:id', auth.authenticateInstitute, async (req, res) => {
  try {
    const institute = await Institute.findByIdAndDelete(req.params.id);
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    res.json({
      success: true,
      message: 'Institute deleted successfully'
    });
  } catch (error) {
    console.error('Delete institute error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;