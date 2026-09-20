import mongoose from 'mongoose'

// Одна дата = один 30-хвилинний слот, зайнятий бронюванням.
// Унікальний індекс гарантує, що два записи не можуть зарезервувати той самий слот,
// навіть якщо запити на бронювання прийшли одночасно.
const bookedSlotSchema = new mongoose.Schema({
  slot: { type: Date, required: true, unique: true },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
})

export default mongoose.model('BookedSlot', bookedSlotSchema)
