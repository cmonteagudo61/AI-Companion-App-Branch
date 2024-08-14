const mongoose = require('mongoose');

const dialogueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  startTime: { type: Date, required: true },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: { type: Number, required: true, min: 1 },
  summary: { type: String, default: '' },
  status: { type: String, enum: ['planned', 'in-progress', 'completed'], default: 'planned' }
}, { timestamps: true });

module.exports = mongoose.model('Dialogue', dialogueSchema);