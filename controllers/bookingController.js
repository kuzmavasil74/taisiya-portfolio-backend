import sendEmail from '../utils/emailService.js'
import Booking from '../models/Booking.js'
const createBooking = async (req, res, next) => {
  try {
    const { name, email, phone, date, service, comments } = req.body

    const existingBooking = await Booking.findOne({ date, service })
    if (existingBooking) {
      return res.status(400).json({ message: 'Slot is already booked.' })
    }

    const newBooking = new Booking({
      name,
      email,
      phone,
      date,
      service,
      comments,
    })
    await newBooking.save()

    // Send email confirmation
    const subject = 'Your Appointment Confirmation'
    const text = `Dear ${name},\n\nYour appointment for ${service} on ${new Date(
      date
    ).toLocaleString()} has been confirmed.\n\nThank you!`
    await sendEmail(email, subject, text)

    res
      .status(201)
      .json({ message: 'Booking created successfully', booking: newBooking })
  } catch (error) {
    next(error)
  }
}
export default createBooking
