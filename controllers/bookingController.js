import mongoose from 'mongoose'
import Booking from '../models/Booking.js'

// CREATE BOOKING
export const createBooking = async (req, res) => {
  try {
    const { name, phone, telegram, service, date } = req.body

    const booking = await Booking.create({
      name,
      phone,
      telegram,
      service,
      date,
      userId: new mongoose.Types.ObjectId(req.user.id),
    })

    return res.status(201).json(booking)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Server error' })
  }
}

// GET ALL BOOKINGS
export const getBooking = async (req, res) => {
  try {
    let bookings

    if (req.user.role === 'admin') {
      bookings = await Booking.find().populate('userId')
    } else {
      console.log(req.user, typeof req.user.id)
      bookings = await Booking.find({
        userId: new mongoose.Types.ObjectId(req.user.id),
      })
    }

    return res.status(200).json(bookings)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Server error' })
  }
}

// GET BOOKING BY ID
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ message: 'Booking not found' })

    if (
      req.user.role !== 'admin' &&
      booking.userId.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    return res.status(200).json(booking)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Server error' })
  }
}

// UPDATE BOOKING
export const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ message: 'Booking not found' })

    if (
      req.user.role !== 'admin' &&
      booking.userId.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const { name, phone, telegram, service, date } = req.body
    if (name) booking.name = name
    if (phone) booking.phone = phone
    if (telegram) booking.telegram = telegram
    if (service) booking.service = service
    if (date) booking.date = date

    await booking.save()
    return res.status(200).json(booking)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Server error' })
  }
}

// DELETE BOOKING
export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ message: 'Booking not found' })

    if (
      req.user.role !== 'admin' &&
      booking.userId.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    await Booking.findByIdAndDelete(req.params.id)
    return res.status(200).json({ message: 'Booking deleted' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Server error' })
  }
}
export const getBookingPaginated = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 6
    const skip = (page - 1) * limit
    const today = new Date()

    // статус можна передавати: 'upcoming' або 'archive'
    const status = req.query.status || 'all'

    let filter = {}
    if (status === 'upcoming') {
      filter.date = { $gte: today }
    } else if (status === 'archive') {
      filter.date = { $lt: today }
    }

    const bookings = await Booking.find(filter)
      .sort({ date: status === 'upcoming' ? 1 : -1 }) // сортуємо по даті
      .skip(skip)
      .limit(limit)

    const total = await Booking.countDocuments(filter)

    res.json({
      data: bookings,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}
