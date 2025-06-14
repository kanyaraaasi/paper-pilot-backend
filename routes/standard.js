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
