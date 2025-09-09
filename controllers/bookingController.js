import Booking from '../models/Booking.js'

export const createBooking = async (req, res) => {
  try {
    const { name, phone, telegram, service, date } = req.body
    const booking = await Booking.create({
      name,
      phone,
      telegram,
      service,
      date,
    })
    return res.status(201).json(booking)
  } catch (err) {
    return res.status(500).json({ message: 'Server error' })
  }
}
export const getBooking = async (req, res) => {
  try {
    const booking = await Booking.find()
    return res.status(200).json(booking)
  } catch (err) {
    return res.status(500).json({ message: 'Server error' })
  }
}
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' })
    }
    return res.status(200).json(booking)
  } catch (err) {
    return res.status(500).json({ message: 'Server error' })
  }
}

export const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' })
    }
    const { name, phone, telegram, service, date } = req.body
    if (name) {
      booking.name = name
    }
    if (phone) {
      booking.phone = phone
    }
    if (telegram) {
      booking.telegram = telegram
    }
    if (service) {
      booking.service = service
    }
    if (date) {
      booking.date = date
    }
    await booking.save()
    return res.status(200).json(booking)
  } catch (err) {
    return res.status(500).json({ message: 'Server error' })
  }
}

export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' })
    }
    await Booking.findByIdAndDelete(req.params.id)
    return res.status(200).json({ message: 'Booking deleted' })
  } catch (err) {
    return res.status(500).json({ message: 'Server error' })
  }
}
