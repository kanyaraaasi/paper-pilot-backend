const express = require('express');
const Standard = require('../models/Standard');
const router = express.Router();

// Get all standards
router.get('/', async (req, res) => {
  try {
    const { board, stream, medium } = req.query;
    const filter = { isActive: true };
    
    if (board) filter.board = board;
    if (stream) filter.stream = stream;
    if (medium) filter.medium = medium;

    const standards = await Standard.find(filter).sort({ name: 1 });
    res.json(standards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk create standards
router.post('/bulk', async (req, res) => {
  try {
    const standards = req.body;

    if (!Array.isArray(standards) || standards.length === 0) {
      return res.status(400).json({ message: 'Request body must be a non-empty array of standards.' });
    }

    const insertedStandards = await Standard.insertMany(standards, { ordered: false });
    res.status(201).json(insertedStandards);
  } catch (error) {
    if (error.name === 'BulkWriteError') {
      return res.status(400).json({ message: 'Some standards could not be added due to duplicates or validation errors.', error });
    }
    res.status(500).json({ message: error.message });
  }
});


// Create new standard
router.post('/', async (req, res) => {
  try {
    const standard = new Standard(req.body);
    await standard.save();
    res.status(201).json(standard);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get standard by ID
router.get('/:id', async (req, res) => {
  try {
    const standard = await Standard.findById(req.params.id);
    if (!standard) {
      return res.status(404).json({ message: 'Standard not found' });
    }
    res.json(standard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update standard
router.put('/:id', async (req, res) => {
  try {
    const standard = await Standard.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!standard) {
      return res.status(404).json({ message: 'Standard not found' });
    }
    res.json(standard);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get unique values for filters
router.get('/filters/values', async (req, res) => {
  try {
    const boards = await Standard.distinct('board', { isActive: true });
    const streams = await Standard.distinct('stream', { isActive: true });
    const mediums = await Standard.distinct('medium', { isActive: true });
    
    res.json({ boards, streams, mediums });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
