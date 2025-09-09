import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    telegram: { type: String, trim: true },
    service: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
  },
  { timestamps: true }
)

export default mongoose.model('Booking', bookingSchema)
