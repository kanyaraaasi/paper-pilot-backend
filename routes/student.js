const express = require('express');
const Student = require('../models/Student');
const User = require('../models/User');
const { authenticateInstitute, checkPermission } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Get all students for institute
router.get('/', authenticateInstitute, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      batch, 
      standard, 
      academicYear,
      isActive,
      search 
    } = req.query;
    
    const filter = { institute: req.instituteId };
    
    if (batch) filter.batch = batch;
    if (standard) filter.standard = standard;
    if (academicYear) filter.academicYear = academicYear;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    // Search functionality
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const students = await Student.find(filter)
      .populate('batch', 'name code')
      .populate('standard', 'name code level')
      .populate('academicYear', 'year')
      .sort({ rollNumber: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Student.countDocuments(filter);
    
    res.json({
      students,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      code: 'FETCH_ERROR'
    });
  }
});

// Get single student
router.get('/:id', authenticateInstitute, async (req, res) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      institute: req.instituteId
    })
    .populate('batch', 'name code')
    .populate('standard', 'name code level')
    .populate('academicYear', 'year');

    if (!student) {
      return res.status(404).json({ 
        message: 'Student not found',
        code: 'NOT_FOUND'
      });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      code: 'FETCH_ERROR'
    });
  }
});

// Create new student
router.post('/', authenticateInstitute, checkPermission('manage_students'), async (req, res) => {
  try {
    const { email, password, ...studentData } = req.body;
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Email already exists',
        code: 'EMAIL_EXISTS'
      });
    }

    // Create user account
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      role: 'student',
      institute: req.instituteId,
      isActive: true
    });

    await user.save();

    // Create student profile
    const student = new Student({
      ...studentData,
      user: user._id,
      institute: req.instituteId
    });

    await student.save();
    await student.populate([
      { path: 'batch', select: 'name code' },
      { path: 'standard', select: 'name code level' },
      { path: 'academicYear', select: 'year' }
    ]);
    
    res.status(201).json({
      message: 'Student created successfully',
      student
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message,
      code: 'CREATION_ERROR'
    });
  }
});

// Update student
router.put('/:id', authenticateInstitute, checkPermission('manage_students'), async (req, res) => {
  try {
    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, institute: req.instituteId },
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate([
      { path: 'batch', select: 'name code' },
      { path: 'standard', select: 'name code level' },
      { path: 'academicYear', select: 'year' }
    ]);

    if (!student) {
      return res.status(404).json({ 
        message: 'Student not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      message: 'Student updated successfully',
      student
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message,
      code: 'UPDATE_ERROR'
    });
  }
});

// Bulk import students
router.post('/bulk-import', authenticateInstitute, checkPermission('manage_students'), async (req, res) => {
  try {
    const { students } = req.body;
    
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ 
        message: 'Students array is required',
        code: 'INVALID_INPUT'
      });
    }

    const processedStudents = [];
    const errors = [];

    for (let i = 0; i < students.length; i++) {
      try {
        const { email, password, ...studentData } = students[i];
        
        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          errors.push({
            index: i,
            message: 'Email already exists',
            email
          });
          continue;
        }

        // Create user account
        const hashedPassword = await bcrypt.hash(password || 'student123', 10);
        const user = new User({
          email,
          password: hashedPassword,
          role: 'student',
          institute: req.instituteId,
          isActive: true
        });

        await user.save();

        // Create student profile
        const student = new Student({
          ...studentData,
          user: user._id,
          institute: req.instituteId
        });

        await student.save();
        processedStudents.push(student);
      } catch (error) {
        errors.push({
          index: i,
          message: error.message
        });
      }
    }

    res.json({
      message: `Imported ${processedStudents.length} students successfully`,
      imported: processedStudents.length,
      errors: errors.length,
      errorDetails: errors
    });
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      code: 'BULK_IMPORT_ERROR'
    });
  }
});

// Delete student
router.delete('/:id', authenticateInstitute, checkPermission('manage_students'), async (req, res) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      institute: req.instituteId
    });

    if (!student) {
      return res.status(404).json({ 
        message: 'Student not found',
        code: 'NOT_FOUND'
      });
    }

    // Delete user account as well
    await User.findByIdAndDelete(student.user);
    await Student.findByIdAndDelete(student._id);

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      code: 'DELETE_ERROR'
    });
  }
});

module.exports = router;
