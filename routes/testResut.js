const express = require('express');
const TestResult = require('../models/TestResult');
const Test = require('../models/Test');
const Question = require('../models/Question');
const { authenticateInstitute, checkPermission } = require('../middleware/auth');
const router = express.Router();

// Submit test (Student)
router.post('/submit', authenticateInstitute, async (req, res) => {
  try {
    const { testId, answers, timeSpent } = req.body;
    
    const test = await Test.findOne({
      _id: testId,
      institute: req.user.institute,
      status: 'published'
    }).populate('questions.question');

    if (!test) {
      return res.status(404).json({ 
        message: 'Test not found or not available',
        code: 'NOT_FOUND'
      });
    }

    // Check if already submitted
    const existingResult = await TestResult.findOne({
      test: testId,
      student: req.user._id
    });

    if (existingResult) {
      return res.status(400).json({ 
        message: 'Test already submitted',
        code: 'ALREADY_SUBMITTED'
      });
    }

    // Calculate score
    let totalScore = 0;
    const evaluatedAnswers = [];

    for (const answer of answers) {
      const questionInTest = test.questions.find(q => 
        q.question._id.toString() === answer.questionId
      );
      
      if (questionInTest) {
        const question = questionInTest.question;
        const isCorrect = question.correctAnswer === answer.selectedAnswer;
        const score = isCorrect ? (questionInTest.marks || 1) : 0;
        
        totalScore += score;
        
        evaluatedAnswers.push({
          question: answer.questionId,
          selectedAnswer: answer.selectedAnswer,
          isCorrect,
          score,
          maxScore: questionInTest.marks || 1
        });
      }
    }

    const percentage = (totalScore / test.totalMarks) * 100;

    const testResult = new TestResult({
      test: testId,
      student: req.user._id,
      institute: req.user.institute,
      answers: evaluatedAnswers,
      totalScore,
      maxScore: test.totalMarks,
      percentage,
      timeSpent,
      submittedAt: new Date()
    });

    await testResult.save();
    
    res.json({
      message: 'Test submitted successfully',
      result: {
        totalScore,
        maxScore: test.totalMarks,
        percentage,
        timeSpent
      }
    });
  } catch (error) {
    res.status(400).json({ 
      message: error.message,
      code: 'SUBMISSION_ERROR'
    });
  }
});

// Get test results for institute
router.get('/', authenticateInstitute, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      test, 
      student, 
      batch,
      minScore,
      maxScore 
    } = req.query;
    
    const filter = { institute: req.instituteId };
    
    if (test) filter.test = test;
    if (student) filter.student = student;
    if (minScore) filter.totalScore = { $gte: parseInt(minScore) };
    if (maxScore) filter.totalScore = { ...filter.totalScore, $lte: parseInt(maxScore) };

    let query = TestResult.find(filter)
      .populate('test', 'title type totalMarks')
      .populate('student', 'firstName lastName email rollNumber')
      .sort({ submittedAt: -1 });

    // Filter by batch if specified
    if (batch) {
      query = query.populate({
        path: 'student',
        match: { batch: batch },
        select: 'firstName lastName email rollNumber'
      });
    }

    const skip = (page - 1) * limit;
    const results = await query.skip(skip).limit(parseInt(limit));
    
    // Filter out null students (from batch filtering)
    const filteredResults = results.filter(result => result.student);
    
    const total = await TestResult.countDocuments(filter);
    
    res.json({
      results: filteredResults,
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

// Get detailed result
router.get('/:id', authenticateInstitute, async (req, res) => {
  try {
    const result = await TestResult.findOne({
      _id: req.params.id,
      institute: req.instituteId
    })
    .populate('test', 'title questions')
    .populate('student', 'firstName lastName email rollNumber')
    .populate('answers.question', 'content type options correctAnswer');

    if (!result) {
      return res.status(404).json({ 
        message: 'Test result not found',
        code: 'NOT_FOUND'
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      code: 'FETCH_ERROR'    });
  }
});

// Get student's own results
router.get('/my-results', authenticateUser, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (page - 1) * limit;
    const results = await TestResult.find({ student: req.user._id })
      .populate('test', 'title type totalMarks duration')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await TestResult.countDocuments({ student: req.user._id });
    
    res.json({
      results,
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

// Analytics - Test performance
router.get('/analytics/test/:testId', authenticateInstitute, checkPermission('view_analytics'), async (req, res) => {
  try {
    const testId = req.params.testId;
    
    const analytics = await TestResult.aggregate([
      { 
        $match: { 
          test: require('mongoose').Types.ObjectId(testId),
          institute: require('mongoose').Types.ObjectId(req.instituteId)
        }
      },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: 1 },
          averageScore: { $avg: '$totalScore' },
          averagePercentage: { $avg: '$percentage' },
          maxScore: { $max: '$totalScore' },
          minScore: { $min: '$totalScore' },
          averageTime: { $avg: '$timeSpent' }
        }
      }
    ]);

    // Score distribution
    const distribution = await TestResult.aggregate([
      { 
        $match: { 
          test: require('mongoose').Types.ObjectId(testId),
          institute: require('mongoose').Types.ObjectId(req.instituteId)
        }
      },
      {
        $bucket: {
          groupBy: '$percentage',
          boundaries: [0, 35, 50, 65, 80, 100],
          default: 'other',
          output: {
            count: { $sum: 1 },
            students: { $push: '$student' }
          }
        }
      }
    ]);

    res.json({
      summary: analytics[0] || {},
      distribution
    });
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      code: 'ANALYTICS_ERROR'
    });
  }
});

module.exports = router;
