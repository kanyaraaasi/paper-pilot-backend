const mongoose = require('mongoose');
const AcademicYear = require('../models/AcademicYear');
const Batch = require('../models/Batch');
const Standard = require('../models/Standard');
const Subject = require('../models/Subject');
const Question = require('../models/Question');

const seedData = async () => {
  try {
    // Clear existing data
    await AcademicYear.deleteMany({});
    await Batch.deleteMany({});
    await Standard.deleteMany({});
    await Subject.deleteMany({});
    await Question.deleteMany({});

    // Create Academic Year
    const academicYear = await AcademicYear.create({
      year: '2024-25',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2025-05-31'),
      isActive: true,
      description: 'Academic Year 2024-25'
    });

    // Create Batch
    const batch = await Batch.create({
      name: 'Batch A',
      code: 'BA-2024',
      academicYear: academicYear._id,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2025-05-31'),
      maxStudents: 50,
      currentStudents: 30,
      isActive: true
    });

    // Create Standard
    const standard = await Standard.create({
      name: 'Class 10',
      code: 'STD-10',
      level: 'Secondary',
      board: 'Maharashtra State Board',
      stream: 'General',
      medium: 'English',
      isActive: true
    });

    // Create Subject with Chapters
    const subject = await Subject.create({
      name: 'Mathematics',
      code: 'MATH-10',
      alias: 'Math',
      standard: standard._id,
      icon: '🧮',
      color: '#3B82F6',
      chapters: [
        {
          name: 'Real Numbers',
          code: 'CH-01',
          sequence: 1,
          weightage: 15,
          difficulty: 'Medium',
          description: 'Introduction to real numbers and their properties'
        },
        {
          name: 'Polynomials',
          code: 'CH-02',
          sequence: 2,
          weightage: 20,
          difficulty: 'Medium',
          description: 'Study of polynomials and their operations'
        },
        {
          name: 'Linear Equations',
          code: 'CH-03',
          sequence: 3,
          weightage: 25,
          difficulty: 'Hard',
          description: 'Solving linear equations in two variables'
        }
      ],
      totalMarks: 100,
      passingMarks: 35,
      isActive: true
    });

    // Create Sample Questions
    const questions = [
      {
        content: 'What is the HCF of 12 and 18?',
        type: 'Short Answer',
        difficulty: 'Easy',
        marks: 2,
        subject: subject._id,
        chapter: subject.chapters[0]._id,
        chapterName: 'Real Numbers',
        correctAnswer: '6',
        explanation: 'HCF of 12 and 18 is 6 as it is the highest common factor.',
        bloomsLevel: 'Remember',
        tags: ['HCF', 'Real Numbers', 'Basic']
      },
      {
        content: 'Find the zeroes of the polynomial p(x) = x² - 5x + 6',
        type: 'Long Answer',
        difficulty: 'Medium',
        marks: 4,
        subject: subject._id,
        chapter: subject.chapters[1]._id,
        chapterName: 'Polynomials',
        correctAnswer: 'x = 2, x = 3',
        explanation: 'By factoring: (x-2)(x-3) = 0, so x = 2 or x = 3',
        bloomsLevel: 'Apply',
        tags: ['Polynomials', 'Zeroes', 'Factoring']
      },
      {
        content: 'The value of √2 is:',
        type: 'MCQ',
        difficulty: 'Easy',
        marks: 1,
        subject: subject._id,
        chapter: subject.chapters[0]._id,
        chapterName: 'Real Numbers',
        options: [
          { text: '1.414', isCorrect: true },
          { text: '1.732', isCorrect: false },
          { text: '2.236', isCorrect: false },
          { text: '1.618', isCorrect: false }
        ],
        explanation: '√2 ≈ 1.414',
        bloomsLevel: 'Remember',
        tags: ['Square Root', 'Irrational Numbers']
      }
    ];

    await Question.insertMany(questions);

    console.log('Sample data seeded successfully!');
    return {
      academicYear,
      batch,
      standard,
      subject,
      questionsCount: questions.length
    };
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
};

module.exports = seedData;
