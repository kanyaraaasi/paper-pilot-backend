// Updated models/AcademicYear.js (with institute reference)
const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema({
  year: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true
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

// Compound index for unique year per institute
academicYearSchema.index({ year: 1, institute: 1 }, { unique: true });

module.exports = mongoose.model('AcademicYear', academicYearSchema);
