const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

const academicYearValidation = [
  body('year').notEmpty().withMessage('Year is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  handleValidationErrors
];

const batchValidation = [
  body('name').notEmpty().withMessage('Batch name is required'),
  body('code').notEmpty().withMessage('Batch code is required'),
  body('academicYear').isMongoId().withMessage('Valid academic year ID is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  handleValidationErrors
];

const standardValidation = [
  body('name').notEmpty().withMessage('Standard name is required'),
  body('code').notEmpty().withMessage('Standard code is required'),
  body('level').isIn(['Primary', 'Secondary', 'Higher Secondary', 'Graduate', 'Post Graduate'])
    .withMessage('Valid level is required'),
  body('board').isIn(['Maharashtra State Board', 'CBSE', 'ICSE', 'IB', 'Cambridge', 'Other'])
    .withMessage('Valid board is required'),
  body('stream').isIn(['Science', 'Commerce', 'Arts', 'General'])
    .withMessage('Valid stream is required'),
  body('medium').isIn(['English', 'Hindi', 'Marathi', 'Other'])
    .withMessage('Valid medium is required'),
  handleValidationErrors
];

const subjectValidation = [
  body('name').notEmpty().withMessage('Subject name is required'),
  body('code').notEmpty().withMessage('Subject code is required'),
  body('standard').isMongoId().withMessage('Valid standard ID is required'),
  handleValidationErrors
];

const questionValidation = [
  body('content').notEmpty().withMessage('Question content is required'),
  body('type').isIn(['MCQ', 'Short Answer', 'Long Answer', 'Fill in the Blanks', 'True/False', 'Match the Following', 'Numerical'])
    .withMessage('Valid question type is required'),
  body('difficulty').isIn(['Easy', 'Medium', 'Hard']).withMessage('Valid difficulty is required'),
  body('marks').isInt({ min: 1 }).withMessage('Marks must be a positive integer'),
  body('subject').isMongoId().withMessage('Valid subject ID is required'),
  body('chapter').isMongoId().withMessage('Valid chapter ID is required'),
  handleValidationErrors
];

const testValidation = [
  body('name').notEmpty().withMessage('Test name is required'),
  body('academicYear').isMongoId().withMessage('Valid academic year ID is required'),
  body('batch').isMongoId().withMessage('Valid batch ID is required'),
  body('standard').isMongoId().withMessage('Valid standard ID is required'),
  body('subject').isMongoId().withMessage('Valid subject ID is required'),
  body('duration').notEmpty().withMessage('Duration is required'),
  body('totalMarks').isInt({ min: 1 }).withMessage('Total marks must be a positive integer'),
  body('passingMarks').isInt({ min: 0 }).withMessage('Passing marks must be a non-negative integer'),
  handleValidationErrors
];

module.exports = {
  academicYearValidation,
  batchValidation,
  standardValidation,
  subjectValidation,
  questionValidation,
  testValidation,
  handleValidationErrors
};
