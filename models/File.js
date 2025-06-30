// models/File.js
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name: String,
  supabasePath: String,
  publicUrl: String,
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', fileSchema);
