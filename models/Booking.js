const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  date: { type: Date, required: true },
  service: { type: String, required: true },
  comments: { type: String },
  createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model('Booking', bookingSchema)
