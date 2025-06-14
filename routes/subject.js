const express = require('express');
const Subject = require('../models/Subject');
const router = express.Router();

// Get subjects by standard
router.get('/standard/:standardId', async (req, res) => {
  try {
    const subjects = await Subject.find({ 
      standard: req.params.standardId, 
      isActive: true 
    })
    .populate('standard', 'name code board stream medium')
    .sort({ name: 1 });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all subjects
router.get('/', async (req, res) => {
  try {
    const subjects = await Subject.find({ isActive: true })
      .populate('standard', 'name code board stream medium')
      .sort({ name: 1 });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new subject
router.post('/', async (req, res) => {
  try {
    const subject = new Subject(req.body);
    await subject.save();
    await subject.populate('standard', 'name code board stream medium');
    res.status(201).json(subject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get subject by ID with chapters
router.get('/:id', async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('standard', 'name code board stream medium');
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add chapter to subject
router.post('/:id/chapters', async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    subject.chapters.push(req.body);
    await subject.save();
    
    res.status(201).json(subject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update chapter
router.put('/:id/chapters/:chapterId', async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    const chapter = subject.chapters.id(req.params.chapterId);
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    
    Object.assign(chapter, req.body);
    await subject.save();
    
    res.json(subject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete chapter
router.delete('/:id/chapters/:chapterId', async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    subject.chapters.id(req.params.chapterId).remove();
    await subject.save();
    
    res.json({ message: 'Chapter deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
