import mongoose from 'mongoose'

const BookingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },

  coments: {
    type: String,
  },
})

export default mongoose.model('Booking', BookingSchema)
