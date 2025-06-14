const express = require('express');
const Test = require('../models/Test');
const Question = require('../models/Question');
const Subject = require('../models/Subject');
const mongoose = require('mongoose');
const router = express.Router();

// Get all tests with filters
router.get('/', async (req, res) => {
  try {
    const { 
      academicYear, 
      batch, 
      standard, 
      subject, 
      status,
      page = 1, 
      limit = 10 
    } = req.query;
    
    const filter = {};
    
    if (academicYear) filter.academicYear = academicYear;
    if (batch) filter.batch = batch;
    if (standard) filter.standard = standard;
    if (subject) filter.subject = subject;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const tests = await Test.find(filter)
      .populate('academicYear', 'year')
      .populate('batch', 'name code')
      .populate('standard', 'name code board stream medium')
      .populate('subject', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Test.countDocuments(filter);
    
    res.json({
      tests,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new test
router.post('/', async (req, res) => {
  try {
    const test = new Test(req.body);
    await test.save();
    await test.populate([
      { path: 'academicYear', select: 'year' },
      { path: 'batch', select: 'name code' },
      { path: 'standard', select: 'name code board stream medium' },
      { path: 'subject', select: 'name code' }
    ]);
    
    res.status(201).json(test);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get test by ID
router.get('/:id', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('academicYear', 'year')
      .populate('batch', 'name code')
      .populate('standard', 'name code board stream medium')
      .populate('subject', 'name code chapters')
      .populate('selectedQuestions.questionId');
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update test
router.put('/:id', async (req, res) => {
  try {
    const test = await Test.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate([
      { path: 'academicYear', select: 'year' },
      { path: 'batch', select: 'name code' },
      { path: 'standard', select: 'name code board stream medium' },
      { path: 'subject', select: 'name code' }
    ]);
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    res.json(test);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete test
router.delete('/:id', async (req, res) => {
  try {
    const test = await Test.findByIdAndUpdate(
      req.params.id,
      { status: 'archived' },
      { new: true }
    );
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    res.json({ message: 'Test archived successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Generate test questions automatically
router.post('/:id/generate-questions', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('subject', 'chapters');
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const selectedQuestions = [];
    let sequence = 1;

    for (const selectedChapter of test.selectedChapters) {
      const { chapterId, easyQuestions, mediumQuestions, hardQuestions } = selectedChapter;
      
      // Get easy questions
      if (easyQuestions > 0) {
        const questions = await Question.find({
          subject: test.subject._id,
          chapter: chapterId,
          difficulty: 'Easy',
          isActive: true
        }).limit(easyQuestions);
        
        questions.forEach(q => {
          selectedQuestions.push({
            questionId: q._id,
            marks: q.marks,
            sequence: sequence++
          });
        });
      }

      // Get medium questions
      if (mediumQuestions > 0) {
        const questions = await Question.find({
          subject: test.subject._id,
          chapter: chapterId,
          difficulty: 'Medium',
          isActive: true
        }).limit(mediumQuestions);
        
        questions.forEach(q => {
          selectedQuestions.push({
            questionId: q._id,
            marks: q.marks,
            sequence: sequence++
          });
        });
      }

      // Get hard questions
      if (hardQuestions > 0) {
        const questions = await Question.find({
          subject: test.subject._id,
          chapter: chapterId,
          difficulty: 'Hard',
          isActive: true
        }).limit(hardQuestions);
        
        questions.forEach(q => {
          selectedQuestions.push({
            questionId: q._id,
            marks: q.marks,
            sequence: sequence++
          });
        });
      }
    }

    // Calculate total marks
    const totalMarks = selectedQuestions.reduce((sum, q) => sum + q.marks, 0);

    // Update test with selected questions
    test.selectedQuestions = selectedQuestions;
    test.totalMarks = totalMarks;
    await test.save();

    res.json({
      message: 'Questions generated successfully',
      totalQuestions: selectedQuestions.length,
      totalMarks
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get test paper preview
router.get('/:id/preview', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('academicYear', 'year')
      .populate('batch', 'name code')
      .populate('standard', 'name code board stream medium')
      .populate('subject', 'name code')
      .populate({
        path: 'selectedQuestions.questionId',
        model: 'Question'
      });
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Sort questions by sequence
    test.selectedQuestions.sort((a, b) => a.sequence - b.sequence);

    res.json(test);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Publish test
router.patch('/:id/publish', async (req, res) => {
  try {
    const test = await Test.findByIdAndUpdate(
      req.params.id,
      { status: 'published' },
      { new: true }
    );
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    res.json({ message: 'Test published successfully', test });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Clone test
router.post('/:id/clone', async (req, res) => {
  try {
    const originalTest = await Test.findById(req.params.id);
    if (!originalTest) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const clonedTest = new Test({
      ...originalTest.toObject(),
      _id: undefined,
      name: `${originalTest.name} - Copy`,
      status: 'draft',
      createdAt: undefined,
      updatedAt: undefined
    });

    await clonedTest.save();
    await clonedTest.populate([
      { path: 'academicYear', select: 'year' },
      { path: 'batch', select: 'name code' },
      { path: 'standard', select: 'name code board stream medium' },
      { path: 'subject', select: 'name code' }
    ]);

    res.status(201).json(clonedTest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
