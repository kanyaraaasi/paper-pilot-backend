const express = require('express');
const Batch = require('../models/Batch');
const router = express.Router();

// Get batches by academic year
router.get('/academic-year/:academicYearId', async (req, res) => {
  try {
    const batches = await Batch.find({ 
      academicYear: req.params.academicYearId, 
      isActive: true 
    })
    .populate('academicYear', 'year')
    .sort({ name: 1 });
    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all batches
router.get('/', async (req, res) => {
  try {
    const batches = await Batch.find({ isActive: true })
      .populate('academicYear', 'year')
      .sort({ name: 1 });
    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new batch
router.post('/', async (req, res) => {
  try {
    const batch = new Batch(req.body);
    await batch.save();
    await batch.populate('academicYear', 'year');
    res.status(201).json(batch);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get batch by ID
router.get('/:id', async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('academicYear', 'year');
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    res.json(batch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update batch
router.put('/:id', async (req, res) => {
  try {
    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('academicYear', 'year');
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    res.json(batch);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete batch
router.delete('/:id', async (req, res) => {
  try {
    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

