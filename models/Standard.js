const mongoose = require('mongoose');

const standardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  level: {
    type: String,
    required: true,
    enum: ['Primary', 'Secondary', 'Higher Secondary', 'Graduate', 'Post Graduate']
  },
  board: {
    type: String,
    required: true,
    enum: ['Maharashtra State Board', 'CBSE', 'ICSE', 'IB', 'Cambridge', 'Other']
  },
  stream: {
    type: String,
    required: true,
    enum: ['Science', 'Commerce', 'Arts', 'General']
  },
  medium: {
    type: String,
    required: true,
    enum: ['English', 'Hindi', 'Marathi', 'Other']
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

module.exports = mongoose.model('Standard', standardSchema);
