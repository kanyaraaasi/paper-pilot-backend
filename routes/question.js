const express = require('express');
const Question = require('../models/Question');
const Subject = require('../models/Subject');
const router = express.Router();

// Get questions with filters
router.get('/', async (req, res) => {
  try {
    const { 
      subject, 
      chapter, 
      difficulty, 
      type, 
      tags, 
      page = 1, 
      limit = 10,
      search 
    } = req.query;
    
    const filter = { isActive: true };
    
    if (subject) filter.subject = subject;
    if (chapter) filter.chapter = chapter;
    if (difficulty) filter.difficulty = difficulty;
    if (type) filter.type = type;
    if (tags) filter.tags = { $in: tags.split(',') };
    if (search) {
      filter.$or = [
        { content: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const questions = await Question.find(filter)
      .populate('subject', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Question.countDocuments(filter);
    
    res.json({
      questions,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get questions by subject and chapter
router.get('/subject/:subjectId/chapter/:chapterId', async (req, res) => {
  try {
    const { difficulty, type, limit = 50 } = req.query;
    const filter = {
      subject: req.params.subjectId,
      chapter: req.params.chapterId,
      isActive: true
    };
    
    if (difficulty) filter.difficulty = difficulty;
    if (type) filter.type = type;

    const questions = await Question.find(filter)
      .populate('subject', 'name code')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new question
router.post('/', async (req, res) => {
  try {
    // Get chapter name from subject
    const subject = await Subject.findById(req.body.subject);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    const chapter = subject.chapters.id(req.body.chapter);
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    
    const questionData = {
      ...req.body,
      chapterName: chapter.name
    };
    
    const question = new Question(questionData);
    await question.save();
    await question.populate('subject', 'name code');
    
    res.status(201).json(question);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Bulk create questions
router.post('/bulk', async (req, res) => {
  try {
    const { questions } = req.body;
    const createdQuestions = [];
    
    for (const questionData of questions) {
      // Get chapter name from subject
      const subject = await Subject.findById(questionData.subject);
      if (subject) {
        const chapter = subject.chapters.id(questionData.chapter);
        if (chapter) {
          questionData.chapterName = chapter.name;
          const question = new Question(questionData);
          await question.save();
          createdQuestions.push(question);
        }
      }
    }
    
    res.status(201).json({
      message: `${createdQuestions.length} questions created successfully`,
      questions: createdQuestions
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get question by ID
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('subject', 'name code');
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update question
router.put('/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('subject', 'name code');
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json(question);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete question
router.delete('/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get question statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Question.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          easyQuestions: { $sum: { $cond: [{ $eq: ['$difficulty', 'Easy'] }, 1, 0] } },
          mediumQuestions: { $sum: { $cond: [{ $eq: ['$difficulty', 'Medium'] }, 1, 0] } },
          hardQuestions: { $sum: { $cond: [{ $eq: ['$difficulty', 'Hard'] }, 1, 0] } }
        }
      }
    ]);
    
    const subjectStats = await Question.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$subject',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: '_id',
          foreignField: '_id',
          as: 'subject'
        }
      },
      {
        $unwind: '$subject'
      },
      {
        $project: {
          _id: 1,
          count: 1,
          subjectName: '$subject.name',
          subjectCode: '$subject.code'
        }
      }
    ]);
    
    res.json({
      summary: stats[0] || { totalQuestions: 0, easyQuestions: 0, mediumQuestions: 0, hardQuestions: 0 },
      subjectStats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get questions by difficulty for a subject
router.get('/subject/:subjectId/difficulty-stats', async (req, res) => {
  try {
    const stats = await Question.aggregate([
      { 
        $match: { 
          subject: new mongoose.Types.ObjectId(req.params.subjectId), 
          isActive: true 
        } 
      },
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
