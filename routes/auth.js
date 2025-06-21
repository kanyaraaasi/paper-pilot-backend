const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Institute = require('../models/Institute');
const User = require('../models/User');
const { authenticateInstitute } = require('../middleware/auth');
const router = express.Router();

// Generate JWT token
const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

// Institute Registration
router.post('/institute/register', async (req, res) => {
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
                message: 'Institute with this email already exists',
                code: 'EMAIL_EXISTS'
            });
        }

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
            verificationToken: crypto.randomBytes(32).toString('hex')
        });

        await institute.save();

        // Generate token
        const token = generateToken({
            id: institute._id,
            type: 'institute',
            email: institute.email
        });

        res.status(201).json({
            message: 'Institute registered successfully',
            token,
            institute
        });
    } catch (error) {
        res.status(400).json({
            message: error.message,
            code: 'REGISTRATION_ERROR'
        });
    }
});

// Institute Login
router.post('/institute/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find institute
        const institute = await Institute.findOne({ email, isActive: true });
        if (!institute) {
            return res.status(401).json({
                message: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Check password
        const isPasswordValid = await institute.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Generate token
        const token = generateToken({
            id: institute._id,
            type: 'institute',
            email: institute.email
        });

        res.json({
            message: 'Login successful',
            token,
            institute
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
            code: 'LOGIN_ERROR'
        });
    }
});

// User Registration (by institute)
router.post('/user/register', authenticateInstitute, async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            role,
            contactNumber,
            subjects,
            permissions
        } = req.body;

        // Check if user already exists in this institute
        const existingUser = await User.findOne({
            email,
            institute: req.instituteId
        });

        if (existingUser) {
            return res.status(400).json({
                message: 'User with this email already exists in your institute',
                code: 'EMAIL_EXISTS'
            });
        }

        // Create new user
        const user = new User({
            firstName,
            lastName,
            email,
            password,
            role: role || 'teacher',
            institute: req.instituteId,
            contactNumber,
            subjects,
            permissions: permissions || ['create_questions', 'edit_questions', 'create_tests']
        });

        await user.save();
        await user.populate('institute', 'name type');

        res.status(201).json({
            message: 'User registered successfully',
            user
        });
    } catch (error) {
        res.status(400).json({
            message: error.message,
            code: 'USER_REGISTRATION_ERROR'
        });
    }
});

// User Login
router.post('/user/login', async (req, res) => {
    try {
        const { email, password, instituteId } = req.body;

        // Find user
        const user = await User.findOne({
            email,
            institute: instituteId,
            isActive: true
        }).populate('institute');

        if (!user || !user.institute.isActive) {
            return res.status(401).json({
                message: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken({
            id: user._id,
            type: 'user',
            email: user.email,
            institute: user.institute._id
        });

        res.json({
            message: 'Login successful',
            token,
            user
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
            code: 'LOGIN_ERROR'
        });
    }
});

// Get current institute/user profile
router.get('/profile', authenticateInstitute, async (req, res) => {
    try {
        if (req.user) {
            // User profile
            const user = await User.findById(req.user._id)
                .populate('institute', 'name type')
                .populate('subjects', 'name code');
            res.json({ type: 'user', profile: user });
        } else {
            // Institute profile
            res.json({ type: 'institute', profile: req.institute });
        }
    } catch (error) {
        res.status(500).json({
            message: error.message,
            code: 'PROFILE_ERROR'
        });
    }
});

// Update profile
router.put('/profile', authenticateInstitute, async (req, res) => {
    try {
        if (req.user) {
            // Update user profile
            const user = await User.findByIdAndUpdate(
                req.user._id,
                { $set: req.body },
                { new: true, runValidators: true }
            ).populate('institute', 'name type')
                .populate('subjects', 'name code');

            res.json({ message: 'Profile updated successfully', user });
        } else {
            // Update institute profile
            const institute = await Institute.findByIdAndUpdate(
                req.institute._id,
                { $set: req.body },
                { new: true, runValidators: true }
            );

            res.json({ message: 'Profile updated successfully', institute });
        }
    } catch (error) {
        res.status(400).json({
            message: error.message,
            code: 'PROFILE_UPDATE_ERROR'
        });
    }
});

// Get institute users (only for institute admin)
router.get('/users', authenticateInstitute, async (req, res) => {
    try {
        if (req.user) {
            return res.status(403).json({
                message: 'Only institute admin can access this endpoint',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        const { page = 1, limit = 10, role, isActive } = req.query;
        const filter = { institute: req.instituteId };

        if (role) filter.role = role;
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        const skip = (page - 1) * limit;
        const users = await User.find(filter)
            .populate('subjects', 'name code')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await User.countDocuments(filter);

        res.json({
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
            code: 'USERS_FETCH_ERROR'
        });
    }
});

router.put('/users/:userId', authenticateInstitute, async (req, res) => {
    try {
        if (req.user) {
            return res.status(403).json({
                message: 'Only institute admin can access this endpoint',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        const user = await User.findOneAndUpdate(
            { _id: req.params.userId, institute: req.instituteId },
            { $set: req.body },
            { new: true, runValidators: true }
        ).populate('subjects', 'name code');

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        res.json({ message: 'User updated successfully', user });
    } catch (error) {
        res.status(400).json({
            message: error.message,
            code: 'USER_UPDATE_ERROR'
        });
    }
});

router.delete('/users/:userId', authenticateInstitute, async (req, res) => {
    try {
        if (req.user) {
            return res.status(403).json({
                message: 'Only institute admin can access this endpoint',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        const user = await User.findOneAndDelete({
            _id: req.params.userId,
            institute: req.instituteId
        });

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({
            message: error.message,
            code: 'USER_DELETE_ERROR'
        });
    }
});

// Change password
router.put('/change-password', authenticateInstitute, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (req.user) {
            // User password change
            const user = await User.findById(req.user._id);
            const isCurrentPasswordValid = await user.comparePassword(currentPassword);

            if (!isCurrentPasswordValid) {
                return res.status(400).json({
                    message: 'Current password is incorrect',
                    code: 'INVALID_CURRENT_PASSWORD'
                });
            }

            user.password = newPassword;
            await user.save();
        } else {
            // Institute password change
            const institute = await Institute.findById(req.institute._id);
            const isCurrentPasswordValid = await institute.comparePassword(currentPassword);

            if (!isCurrentPasswordValid) {
                return res.status(400).json({
                    message: 'Current password is incorrect',
                    code: 'INVALID_CURRENT_PASSWORD'
                });
            }

            institute.password = newPassword;
            await institute.save();
        }

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(400).json({
            message: error.message,
            code: 'PASSWORD_CHANGE_ERROR'
        });
    }
});

module.exports = router;
