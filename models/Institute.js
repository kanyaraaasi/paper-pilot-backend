const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const instituteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['School', 'Coaching Institute', 'College', 'University', 'Training Center']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    pincode: String
  },
  establishedYear: {
    type: Number
  },
  website: {
    type: String,
    trim: true
  },
  logo: {
    type: String, // URL or base64
    trim: true
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  settings: {
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    language: {
      type: String,
      default: 'en'
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

// Hash password before saving
instituteSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
instituteSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
instituteSchema.methods.toJSON = function() {
  const institute = this.toObject();
  delete institute.password;
  delete institute.verificationToken;
  delete institute.resetPasswordToken;
  delete institute.resetPasswordExpires;
  return institute;
};

module.exports = mongoose.model('Institute', instituteSchema);
