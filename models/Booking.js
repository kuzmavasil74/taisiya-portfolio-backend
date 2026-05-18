import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    telegram: { type: String, trim: true },
    service: { type: String, required: true, trim: true },
    date: { type: Date, required: true }, // початок бронювання
    duration: { type: Number, required: true }, // тривалість послуги у хвилинах
    price: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'canceled'],
      default: 'pending',
    },
    userId: {
      type: String,
      default: null,
    },
    telegramId: { type: Number, required: false },
    reminderDaySent: { type: Boolean, default: false },
    reminderHourSent: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export default mongoose.model('Booking', bookingSchema)
