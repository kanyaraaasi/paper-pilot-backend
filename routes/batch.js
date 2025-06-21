const express = require('express');
const Batch = require('../models/Batch');
const AcademicYear = require('../models/AcademicYear');
const { authenticateInstitute } = require('../middleware/auth');
const router = express.Router();

// Get all batches for institute
router.get('/', authenticateInstitute, async (req, res) => {
  try {
    const { page = 1, limit = 10, academicYear, isActive } = req.query;
    const filter = { institute: req.instituteId };
    
    if (academicYear) filter.academicYear = academicYear;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (page - 1) * limit;
    const batches = await Batch.find(filter)
      .populate('academicYear', 'year startDate endDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Batch.countDocuments(filter);
    
    res.json({
      batches,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      code: 'BATCHES_FETCH_ERROR'
    });
  }
});

// Get single batch
router.get('/:id', authenticateInstitute, async (req, res) => {
  try {
    const batch = await Batch.findOne({ 
      _id: req.params.id, 
      institute: req.instituteId 
    }).populate('academicYear', 'year startDate endDate');

    if (!batch) {
      return res.status(404).json({ 
        message: 'Batch not found',
        code: 'BATCH_NOT_FOUND'
      });
    }

    res.json(batch);
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      code: 'BATCH_FETCH_ERROR'
    });
  }
});

// Create batch
router.post('/', authenticateInstitute, async (req, res) => {
  try {
    // Verify academic year belongs to the institute
    const academicYear = await AcademicYear.findOne({
      _id: req.body.academicYear,
      institute: req.instituteId
    });

    if (!academicYear) {
      return res.status(400).json({ 
        message: 'Invalid academic year',
        code: 'INVALID_ACADEMIC_YEAR'
      });
    }

    const batch = new Batch({
      ...req.body,
      institute: req.instituteId
    });

    await batch.save();
    await batch.populate('academicYear', 'year startDate endDate');
    
    res.status(201).json({
      message: 'Batch created successfully',
      batch
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Batch code already exists for this institute',
        code: 'DUPLICATE_BATCH_CODE'
      });
    }
    res.status(400).json({ 
      message: error.message,
      code: 'BATCH_CREATE_ERROR'
    });
  }
});

// Update batch
router.put('/:id', authenticateInstitute, async (req, res) => {
  try {
    if (req.body.academicYear) {
      // Verify academic year belongs to the institute
      const academicYear = await AcademicYear.findOne({
        _id: req.body.academicYear,
        institute: req.instituteId
      });

      if (!academicYear) {
        return res.status(400).json({ 
          message: 'Invalid academic year',
          code: 'INVALID_ACADEMIC_YEAR'
        });
      }
    }

    const batch = await Batch.findOneAndUpdate(
      { _id: req.params.id, institute: req.instituteId },
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('academicYear', 'year startDate endDate');

    if (!batch) {
      return res.status(404).json({ 
        message: 'Batch not found',
        code: 'BATCH_NOT_FOUND'
      });
    }

    res.json({
      message: 'Batch updated successfully',
      batch
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message,
      code: 'BATCH_UPDATE_ERROR'
    });
  }
});

// Delete batch
router.delete('/:id', authenticateInstitute, async (req, res) => {
  try {
    const batch = await Batch.findOneAndDelete({ 
      _id: req.params.id, 
      institute: req.instituteId 
    });

    if (!batch) {
      return res.status(404).json({ 
        message: 'Batch not found',
        code: 'BATCH_NOT_FOUND'
      });
    }

    res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      code: 'BATCH_DELETE_ERROR'
    });
  }
});

module.exports = router;
