const jwt = require('jsonwebtoken');
const Institute = require('../models/Institute');
const User = require('../models/User');

// Institute authentication middleware
const authenticateInstitute = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    if (decoded.type === 'institute') {
      const institute = await Institute.findById(decoded.id);
      if (!institute || !institute.isActive) {
        return res.status(401).json({ 
          message: 'Invalid token or inactive institute.',
          code: 'INVALID_INSTITUTE'
        });
      }
      
      req.institute = institute;
      req.instituteId = institute._id;
    } else if (decoded.type === 'user') {
      const user = await User.findById(decoded.id).populate('institute');
      if (!user || !user.isActive || !user.institute || !user.institute.isActive) {
        return res.status(401).json({ 
          message: 'Invalid token or inactive user/institute.',
          code: 'INVALID_USER'
        });
      }
      
      req.user = user;
      req.institute = user.institute;
      req.instituteId = user.institute._id;
    } else {
      return res.status(401).json({ 
        message: 'Invalid token type.',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    res.status(500).json({ 
      message: 'Authentication error.',
      code: 'AUTH_ERROR'
    });
  }
};

// Permission check middleware
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (req.institute && !req.user) {
      // Institute admin has all permissions
      return next();
    }
    
    if (req.user && req.user.permissions.includes(requiredPermission)) {
      return next();
    }
    
    return res.status(403).json({ 
      message: 'Insufficient permissions.',
      code: 'INSUFFICIENT_PERMISSIONS',
      required: requiredPermission
    });
  };
};

// Role check middleware
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (req.institute && !req.user) {
      // Institute admin access
      return next();
    }
    
    if (req.user && allowedRoles.includes(req.user.role)) {
      return next();
    }
    
    return res.status(403).json({ 
      message: 'Access denied. Insufficient role privileges.',
      code: 'INSUFFICIENT_ROLE',
      required: allowedRoles,
      current: req.user?.role
    });
  };
};

module.exports = {
  authenticateInstitute,
  checkPermission,
  checkRole
};
