import mongoose from 'mongoose'

const waitlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    telegram: { type: String, trim: true },
    service: { type: String, required: true, trim: true },
    date: { type: Date, required: true }, // день, на який хоче потрапити клієнт
    userId: { type: String, default: null },
    telegramId: { type: Number, required: false },
    notified: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export default mongoose.model('Waitlist', waitlistSchema)
