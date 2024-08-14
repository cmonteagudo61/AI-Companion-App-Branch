const Joi = require('joi');
const express = require('express');
const router = express.Router();
const Dialogue = require('./models/Dialogue');  // Adjust the path as needed
const auth = require('./middleware/auth');  // Adjust the path as needed

const dialogueSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  startTime: Joi.date().iso().required(),
  participants: Joi.number().integer().min(1).required(),
  summary: Joi.string().allow('').optional()
}).options({ stripUnknown: true });

// Create a dialogue
router.post('/', auth, async (req, res) => {
  try {
    const { error } = dialogueSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const dialogue = new Dialogue({
      ...req.body,
      host: req.userData.userId
    });
    const savedDialogue = await dialogue.save();
    res.status(201).json(savedDialogue);
  } catch (error) {
    console.error('Error creating dialogue:', error);
    res.status(500).json({ message: 'Error creating dialogue' });
  }
});

// Get all dialogues
router.get('/', auth, async (req, res) => {
  try {
    const dialogues = await Dialogue.find({ host: req.userData.userId });
    res.json(dialogues);
  } catch (error) {
    console.error('Error fetching dialogues:', error);
    res.status(500).json({ message: 'Error fetching dialogues' });
  }
});

// Get a single dialogue by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const dialogue = await Dialogue.findOne({ _id: req.params.id, host: req.userData.userId });
    if (!dialogue) {
      return res.status(404).json({ message: 'Dialogue not found' });
    }
    res.json(dialogue);
  } catch (error) {
    console.error('Error fetching dialogue:', error);
    res.status(500).json({ message: 'Error fetching dialogue' });
  }
});

// Update a dialogue
router.put('/:id', auth, async (req, res) => {
  try {
    console.log('Received update request for dialogue:', req.params.id);
    console.log('Update data:', req.body);
    
    const { error, value } = dialogueSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      console.log('Validation error:', error.details);
      return res.status(400).json({ message: error.details[0].message });
    }

    const dialogue = await Dialogue.findOneAndUpdate(
      { _id: req.params.id, host: req.userData.userId },
      value,  // Use the validated and stripped data directly
      { new: true, runValidators: true }
    );
    
    if (!dialogue) {
      console.log('Dialogue not found or user not authorized');
      return res.status(404).json({ message: 'Dialogue not found or user not authorized' });
    }
    
    console.log('Dialogue updated successfully:', dialogue);
    res.json(dialogue);
  } catch (error) {
    console.error('Error updating dialogue:', error);
    res.status(500).json({ message: 'Error updating dialogue', error: error.message });
  }
});
// Delete a dialogue
router.delete('/:id', auth, async (req, res) => {
  try {
    const dialogue = await Dialogue.findOneAndDelete({ _id: req.params.id, host: req.userData.userId });
    if (!dialogue) {
      return res.status(404).json({ message: 'Dialogue not found' });
    }
    res.json({ message: 'Dialogue deleted successfully' });
  } catch (error) {
    console.error('Error deleting dialogue:', error);
    res.status(500).json({ message: 'Error deleting dialogue' });
  }
});

module.exports = router; 

