const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  isCorrect: {
    type: Boolean,
    default: false
  }
});

const questionSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['MCQ', 'Short Answer', 'Long Answer', 'Fill in the Blanks', 'True/False', 'Match the Following', 'Numerical']
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['Easy', 'Medium', 'Hard']
  },
  marks: {
    type: Number,
    required: true,
    min: 1
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  chapter: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  chapterName: {
    type: String,
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  options: [optionSchema], // For MCQ type questions
  correctAnswer: {
    type: String,
    trim: true
  },
  explanation: {
    type: String,
    trim: true
  },
  image: {
    type: String, // URL or base64
    trim: true
  },
  bloomsLevel: {
    type: String,
    enum: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
    default: 'Understand'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    trim: true
  },
  lastModifiedBy: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

questionSchema.index({ subject: 1, chapter: 1, difficulty: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ type: 1, difficulty: 1 });

module.exports = mongoose.model('Question', questionSchema);
