const mongoose = require('mongoose')

const feedbackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 10 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model('Feedback', feedbackSchema)
