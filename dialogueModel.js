const mongoose = require('mongoose');

const dialogueSchema = new mongoose.Schema({
  title: String,
  participants: Number,
  date: { type: Date, default: Date.now },
  summary: String,
});

module.exports = mongoose.model('Dialogue', dialogueSchema);
