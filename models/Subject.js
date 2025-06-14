const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true
  },
  alias: {
    type: String,
    trim: true
  },
  sequence: {
    type: Number,
    required: true
  },
  weightage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true
  },
  alias: {
    type: String,
    trim: true
  },
  standard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Standard',
    required: true
  },
  icon: {
    type: String,
    default: '📚'
  },
  color: {
    type: String,
    default: '#3B82F6'
  },
  chapters: [chapterSchema],
  totalMarks: {
    type: Number,
    default: 100
  },
  passingMarks: {
    type: Number,
    default: 35
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

subjectSchema.index({ standard: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
