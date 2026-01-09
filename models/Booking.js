import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    telegram: { type: String, trim: true },
    service: { type: String, required: true, trim: true },
    date: { type: Date, required: true }, // початок бронювання
    duration: { type: Number, required: true }, // тривалість послуги у хвилинах
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  { timestamps: true }
)

export default mongoose.model('Booking', bookingSchema)
