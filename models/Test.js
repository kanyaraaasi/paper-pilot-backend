const mongoose = require('mongoose');

const selectedChapterSchema = new mongoose.Schema({
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  chapterName: {
    type: String,
    required: true
  },
  weightage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  easyQuestions: {
    type: Number,
    default: 0
  },
  mediumQuestions: {
    type: Number,
    default: 0
  },
  hardQuestions: {
    type: Number,
    default: 0
  }
});

const selectedQuestionSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  marks: {
    type: Number,
    required: true
  },
  sequence: {
    type: Number,
    required: true
  }
});

const testSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  academicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: true
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true
  },
  standard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Standard',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  totalMarks: {
    type: Number,
    required: true
  },
  passingMarks: {
    type: Number,
    required: true
  },
  questionType: {
    type: String,
    enum: ['textual', 'board', 'mixed'],
    default: 'mixed'
  },
  selectedChapters: [selectedChapterSchema],
  selectedQuestions: [selectedQuestionSchema],
  instructions: {
    type: String,
    trim: true
  },
  examDate: {
    type: Date
  },
  showChapterDetails: {
    type: Boolean,
    default: true
  },
  showWatermark: {
    type: Boolean,
    default: true
  },
  candidateFields: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
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

testSchema.index({ academicYear: 1, batch: 1, subject: 1 });
testSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Test', testSchema);
