// Updated models/Batch.js (with institute reference)
const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
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
  academicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: true
  },
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  maxStudents: {
    type: Number,
    default: 50
  },
  currentStudents: {
    type: Number,
    default: 0
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

batchSchema.index({ code: 1, institute: 1 }, { unique: true });

module.exports = mongoose.model('Batch', batchSchema);
