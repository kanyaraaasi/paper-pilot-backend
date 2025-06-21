const express = require('express');
const Test = require('../models/Test');
const Question = require('../models/Question');
const { authenticateInstitute, checkPermission } = require('../middleware/auth');
const router = express.Router();

// Get all tests for institute
router.get('/', authenticateInstitute, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      batch, 
      standard, 
      subject, 
      type, 
      status,
      createdBy 
    } = req.query;
    
    const filter = { institute: req.instituteId };
    
    if (batch) filter.batch = batch;
    if (standard) filter.standard = standard;
    if (subject) filter.subject = subject;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (createdBy) filter.createdBy = createdBy;

    const skip = (page - 1) * limit;
    const tests = await Test.find(filter)
      .populate('batch', 'name code academicYear')
      .populate('standard', 'name code level')
      .populate('subject', 'name code')
      .populate('createdBy', 'firstName lastName')
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
    res.status(500).json({ 
      message: error.message,
      code: 'FETCH_ERROR'
    });
  }
});

// Get single test
router.get('/:id', authenticateInstitute, async (req, res) => {
  try {
    const test = await Test.findOne({
      _id: req.params.id,
      institute: req.instituteId
    })
    .populate('batch', 'name code academicYear')
    .populate('standard', 'name code level')
    .populate('subject', 'name code')
    .populate('questions.question', 'content type options correctAnswer marks difficulty')
    .populate('createdBy', 'firstName lastName');

    if (!test) {
      return res.status(404).json({ 
        message: 'Test not found',
        code: 'NOT_FOUND'
      });
    }

    res.json(test);
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      code: 'FETCH_ERROR'
    });
  }
});

// Create new test
router.post('/', authenticateInstitute, checkPermission('create_tests'), async (req, res) => {
  try {
    const { questions, ...testData } = req.body;
    
    // Verify all questions belong to institute
    const questionIds = questions.map(q => q.question);
    const validQuestions = await Question.find({
      _id: { $in: questionIds },
      institute: req.instituteId
    });

    if (validQuestions.length !== questionIds.length) {
      return res.status(400).json({ 
        message: 'Some questions are invalid or not accessible',
        code: 'INVALID_QUESTIONS'
      });
    }

    // Calculate total marks
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    const test = new Test({
      ...testData,
      questions,
      totalMarks,
      institute: req.instituteId,
      createdBy: req.user?._id
    });

    await test.save();
    await test.populate([
      { path: 'batch', select: 'name code' },
      { path: 'standard', select: 'name code level' },
      { path: 'subject', select: 'name code' }
    ]);
    
    res.status(201).json({
      message: 'Test created successfully',
      test
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message,
      code: 'CREATION_ERROR'
    });
  }
});

// Update test
router.put('/:id', authenticateInstitute, checkPermission('edit_tests'), async (req, res) => {
  try {
    const { questions, ...updateData } = req.body;
    
    // If questions are being updated, verify them
    if (questions) {
      const questionIds = questions.map(q => q.question);
      const validQuestions = await Question.find({
        _id: { $in: questionIds },
        institute: req.instituteId
      });

      if (validQuestions.length !== questionIds.length) {
        return res.status(400).json({ 
          message: 'Some questions are invalid or not accessible',
          code: 'INVALID_QUESTIONS'
        });
      }

      updateData.questions = questions;
      updateData.totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    }

    const test = await Test.findOneAndUpdate(
      { _id: req.params.id, institute: req.instituteId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate([
      { path: 'batch', select: 'name code' },
      { path: 'standard', select: 'name code level' },
      { path: 'subject', select: 'name code' }
    ]);

    if (!test) {
      return res.status(404).json({ 
        message: 'Test not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      message: 'Test updated successfully',
      test
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message,
      code: 'UPDATE_ERROR'
    });
  }
});

// Publish/Unpublish test
router.patch('/:id/status', authenticateInstitute, checkPermission('manage_tests'), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status',
        code: 'INVALID_STATUS'
      });
    }

    const test = await Test.findOneAndUpdate(
      { _id: req.params.id, institute: req.instituteId },
      { $set: { status } },
      { new: true }
    );

    if (!test) {
      return res.status(404).json({ 
        message: 'Test not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      message: `Test ${status} successfully`,
      test
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message,
      code: 'STATUS_UPDATE_ERROR'
    });
  }
});

// Delete test
router.delete('/:id', authenticateInstitute, checkPermission('delete_tests'), async (req, res) => {
  try {
    const test = await Test.findOneAndDelete({
      _id: req.params.id,
      institute: req.instituteId
    });

    if (!test) {
      return res.status(404).json({ 
        message: 'Test not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      code: 'DELETE_ERROR'
    });
  }
});

// Student routes for taking tests
router.get('/:id/take', authenticateInstitute, async (req, res) => {
  try {
    const test = await Test.findOne({
      _id: req.params.id,
      institute: req.user.institute,
      status: 'published'
    })
    .populate('questions.question', 'content type options marks difficulty')
    .select('-questions.question.correctAnswer'); // Hide correct answers

    if (!test) {
      return res.status(404).json({ 
        message: 'Test not found or not available',
        code: 'NOT_FOUND'
      });
    }

    // Check if test is within time limits
    const now = new Date();
    if (test.startTime && now < test.startTime) {
      return res.status(403).json({ 
        message: 'Test has not started yet',
        code: 'TEST_NOT_STARTED'
      });
    }

    if (test.endTime && now > test.endTime) {
      return res.status(403).json({ 
        message: 'Test has ended',
        code: 'TEST_ENDED'
      });
    }

    res.json(test);
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      code: 'FETCH_ERROR'
    });
  }
});

module.exports = router;
