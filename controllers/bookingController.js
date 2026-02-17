import mongoose from 'mongoose'
import Booking from '../models/Booking.js'
import { DateTime, Interval } from 'luxon'
import { sendBookingNotification } from '../telegramBot.js'
const WORK_START = 9
const WORK_END = 17
const SLOT_INTERVAL = 30
const SERVICE_DURATIONS = {
  haircuts: 60,
  menHaircuts: 30,
  keratin: 90,
  hotBotox: 60,
  coldRestoration: 90,
  coldBotox: 60,
  polishing: 30,
}

// CREATE BOOKING
export const createBooking = async (req, res) => {
  try {
    const { name, phone, telegram, service, date, duration } = req.body

    if (!name || !phone || !service || !date || !duration) {
      return res
        .status(400)
        .json({ message: 'All required fields must be filled' })
    }

    const bookingStart = new Date(date)
    const bookingEnd = new Date(bookingStart.getTime() + duration * 60000)

    // Перевірка накладки
    const existing = await Booking.find({
      service,
      date: { $lt: bookingEnd },
    })

    const conflict = existing.some((b) => {
      const bStart = new Date(b.date)
      const bEnd = new Date(bStart.getTime() + b.duration * 60000)
      return bookingStart < bEnd && bookingEnd > bStart
    })

    if (conflict) {
      return res.status(400).json({ message: 'This slot is already booked' })
    }

    const booking = await Booking.create({
      name,
      phone,
      telegram,
      service,
      date: bookingStart,
      duration,
      userId: null,
    })
    sendBookingNotification(booking)
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
  console.log('=== UPDATE BOOKING ===')
  console.log('Params ID:', req.params.id)
  console.log('Request body:', req.body)
  console.log('User from token:', req.user)

  try {
    const booking = await Booking.findById(req.params.id)
    console.log('Booking found:', booking)

    if (!booking) {
      console.log('Booking not found:', req.params.id)
      return res.status(404).json({ message: 'Booking not found' })
    }

    // Перевірка прав доступу
    if (
      req.user.role !== 'admin' &&
      booking.userId && // якщо є userId
      booking.userId.toString() !== req.user.id
    ) {
      console.log('Forbidden access for user:', req.user.id)
      return res.status(403).json({ message: 'Forbidden' })
    }

    const { name, phone, telegram, service, date, status } = req.body

    if (name) booking.name = name
    if (phone) booking.phone = phone
    if (telegram) booking.telegram = telegram
    if (service) booking.service = service
    if (date) booking.date = date
    if (status && ['pending', 'confirmed', 'canceled'].includes(status)) {
      booking.status = status
    }

    console.log('Booking before save:', booking)

    await booking.save()
    console.log('Booking updated successfully:', booking._id, booking.status)

    return res.status(200).json(booking)
  } catch (err) {
    console.error('Server error in updateBooking:', err)
    return res.status(500).json({ message: 'Server error', error: err.message })
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
// GET AVAILABLE SLOTS (simplified 30-min slots)
export const getBookingPaginated = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 6
    const skip = (page - 1) * limit

    // Локальна зона Прази
    const tz = 'Europe/Prague'
    const now = DateTime.now().setZone(tz)

    // статус можна передавати: 'upcoming' або 'archive'
    const status = req.query.status || 'all'

    let filter = {}

    if (status === 'upcoming') {
      // Всі бронювання, що ще не пройшли
      filter.date = { $gte: now.toJSDate() }
    } else if (status === 'archive') {
      // Всі минулі бронювання
      filter.date = { $lt: now.toJSDate() }
    }

    const bookings = await Booking.find(filter)
      .sort({ date: status === 'upcoming' ? 1 : -1 })
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
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

// GET AVAILABLE SLOTS (30-min slots)
export const getAvailableSlots = async (req, res) => {
  try {
    const { date, startHour = 9, endHour = 20 } = req.query
    if (!date) return res.status(400).json({ message: 'Date is required' })

    // Локальний час для Прази
    const tz = 'Europe/Prague'

    // Поточний час у Празі
    const now = DateTime.now().setZone(tz)

    // День, на який потрібні слоти
    const day = DateTime.fromISO(date, { zone: tz })

    // Всі бронювання на цей день
    const dayStart = day.startOf('day').toJSDate()
    const dayEnd = day.endOf('day').toJSDate()

    const bookings = await Booking.find({
      date: { $gte: dayStart, $lte: dayEnd },
    })

    const slots = []

    for (let hour = startHour; hour < endHour; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const slotStart = day.set({ hour, minute: min, second: 0 })
        const slotEnd = slotStart.plus({ minutes: 30 })

        // Перевірка на конфлікт з існуючими бронюваннями
        const conflict = bookings.some((b) => {
          const bStart = DateTime.fromJSDate(new Date(b.date), { zone: tz })
          const bEnd = bStart.plus({ minutes: b.duration })
          return Interval.fromDateTimes(slotStart, slotEnd).overlaps(
            Interval.fromDateTimes(bStart, bEnd)
          )
        })

        // Пропускаємо минулі слоти
        if (slotStart > now) {
          slots.push({
            time: slotStart.toFormat('HH:mm'),
            available: !conflict,
          })
        }
      }
    }

    res.json(slots)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
}
