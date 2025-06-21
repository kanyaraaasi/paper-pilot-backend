const express = require('express');
const AcademicYear = require('../models/AcademicYear');
const { authenticateInstitute, checkPermission } = require('../middleware/auth');
const router = express.Router();

// Get all academic years for institute
router.get('/', authenticateInstitute, async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;
    const filter = { institute: req.instituteId };
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;
    const academicYears = await AcademicYear.find(filter)
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await AcademicYear.countDocuments(filter);
    
    res.json({
      academicYears,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      code: 'ACADEMIC_YEARS_FETCH_ERROR'
    });
  }
});

// Get single academic year
router.get('/:id', authenticateInstitute, async (req, res) => {
  try {
    const academicYear = await AcademicYear.findOne({ 
      _id: req.params.id, 
      institute: req.instituteId 
    });

    if (!academicYear) {
      return res.status(404).json({ 
        message: 'Academic year not found',
        code: 'ACADEMIC_YEAR_NOT_FOUND'
      });
    }

    res.json(academicYear);
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      code: 'ACADEMIC_YEAR_FETCH_ERROR'
    });
  }
});

// Create academic year
router.post('/', authenticateInstitute, async (req, res) => {
  try {
    const academicYear = new AcademicYear({
      ...req.body,
      institute: req.instituteId
    });

    await academicYear.save();
    res.status(201).json({
      message: 'Academic year created successfully',
      academicYear
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Academic year already exists for this institute',
        code: 'DUPLICATE_ACADEMIC_YEAR'
      });
    }
    res.status(400).json({ 
      message: error.message,
      code: 'ACADEMIC_YEAR_CREATE_ERROR'
    });
  }
});

// Update academic year
router.put('/:id', authenticateInstitute, async (req, res) => {
  try {
    const academicYear = await AcademicYear.findOneAndUpdate(
      { _id: req.params.id, institute: req.instituteId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!academicYear) {
      return res.status(404).json({ 
        message: 'Academic year not found',
        code: 'ACADEMIC_YEAR_NOT_FOUND'
      });
    }

    res.json({
      message: 'Academic year updated successfully',
      academicYear
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message,
      code: 'ACADEMIC_YEAR_UPDATE_ERROR'
    });
  }
});

// Delete academic year
router.delete('/:id', authenticateInstitute, async (req, res) => {
  try {
    const academicYear = await AcademicYear.findOneAndDelete({ 
      _id: req.params.id, 
      institute: req.instituteId 
    });

    if (!academicYear) {
      return res.status(404).json({ 
        message: 'Academic year not found',
        code: 'ACADEMIC_YEAR_NOT_FOUND'
      });
    }

    res.json({ message: 'Academic year deleted successfully' });
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      code: 'ACADEMIC_YEAR_DELETE_ERROR'
    });
  }
});

module.exports = router;
