const express = require('express');
const AcademicYear = require('../models/AcademicYear');
const router = express.Router();

// Get all academic years
router.get('/', async (req, res) => {
  try {
    const academicYears = await AcademicYear.find({ isActive: true })
      .sort({ year: -1 });
    res.json(academicYears);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new academic year
router.post('/', async (req, res) => {
  try {
    const academicYear = new AcademicYear(req.body);
    await academicYear.save();
    res.status(201).json(academicYear);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get academic year by ID
router.get('/:id', async (req, res) => {
  try {
    const academicYear = await AcademicYear.findById(req.params.id);
    if (!academicYear) {
      return res.status(404).json({ message: 'Academic year not found' });
    }
    res.json(academicYear);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update academic year
router.put('/:id', async (req, res) => {
  try {
    const academicYear = await AcademicYear.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!academicYear) {
      return res.status(404).json({ message: 'Academic year not found' });
    }
    res.json(academicYear);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete academic year
router.delete('/:id', async (req, res) => {
  try {
    const academicYear = await AcademicYear.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!academicYear) {
      return res.status(404).json({ message: 'Academic year not found' });
    }
    res.json({ message: 'Academic year deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
