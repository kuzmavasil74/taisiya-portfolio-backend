import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, match: /.+\@.+\..+/ },
  phone: { type: String, required: true },
  date: { type: Date, required: true },
  service: { type: String, required: true },
  comments: { type: String },
  createdAt: { type: Date, default: Date.now },
})

bookingSchema.index({ date: 1, service: 1 }, { unique: true })

const Booking = mongoose.model('Booking', bookingSchema)
export default Booking
