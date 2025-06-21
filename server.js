const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Import routes
const academicYearRoutes = require('./routes/academicYear');
const batchRoutes = require('./routes/batch');
const standardRoutes = require('./routes/standard');
const subjectRoutes = require('./routes/subject');
const questionRoutes = require('./routes/question');
const testRoutes = require('./routes/test');
const seedData = require('./utils/seedData');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
const DB_NAME = 'dev'; // <-- your custom DB name
mongoose.connect(`mongodb+srv://admin123:admin123@paperpilot.7xgba1u.mongodb.net/`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/standards', standardRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/tests', testRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Server Error');
  });

// 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({ message: 'Route not found' });
// });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// seedData()

module.exports = app;
