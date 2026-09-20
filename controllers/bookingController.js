import mongoose from 'mongoose'
import Booking from '../models/Booking.js'
import BookedSlot from '../models/BookedSlot.js'
import { DateTime, Interval } from 'luxon'
import { sendBookingNotification } from '../telegramBot.js'

const SLOT_INTERVAL = 30 // хвилини

// Список дат-меж 30-хвилинних слотів, які займає бронювання цієї тривалості.
const getOccupiedSlots = (start, durationMinutes) => {
  const slots = []
  for (let m = 0; m < durationMinutes; m += SLOT_INTERVAL) {
    slots.push(new Date(start.getTime() + m * 60000))
  }
  return slots
}

const SERVICE_DURATIONS = {
  womenHaircut: 60,
  menHaircut: 30,
  menHaircutBeard: 60,
  balayage: 180,
  airtouch: 240,
  exitBlack: 240,
  brazilianColoring: 180,
  toning: 60,
  restorationShort: 120,
  restorationMedium: 150,
  restorationLong: 180,
  curlingShort: 120,
  curlingMedium: 150,
  curlingLong: 180,
}

const SERVICE_PRICES = {
  womenHaircut: 600,
  menHaircut: 500,
  menHaircutBeard: 600,
  balayage: 2800,
  airtouch: 3500,
  exitBlack: 4000,
  brazilianColoring: 3000,
  toning: 1000,
  restorationShort: 2000,
  restorationMedium: 2200,
  restorationLong: 2400,
  curlingShort: 2100,
  curlingMedium: 2200,
  curlingLong: 2400,
}

// GET SERVICES (єдине джерело правди для тривалості/ціни послуг)
export const getServices = async (req, res) => {
  const services = Object.keys(SERVICE_DURATIONS).map((key) => ({
    key,
    duration: SERVICE_DURATIONS[key],
    price: SERVICE_PRICES[key] || 0,
  }))
  res.json(services)
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

    if (
      !SERVICE_DURATIONS[service] ||
      Number(duration) !== SERVICE_DURATIONS[service]
    ) {
      return res.status(400).json({ message: 'Invalid service or duration' })
    }

    const bookingStart = new Date(date)
    const occupiedSlots = getOccupiedSlots(bookingStart, Number(duration))

    // Атомарне резервування слотів: унікальний індекс на BookedSlot.slot
    // гарантує, що навіть два одночасні запити не зможуть зайняти той самий
    // слот — другий отримає помилку дублікату ключа й відкотиться.
    const session = await mongoose.startSession()
    let booking
    try {
      await session.withTransaction(async () => {
        const [created] = await Booking.create(
          [
            {
              name,
              phone,
              telegram,
              service,
              date: bookingStart,
              duration,
              price: SERVICE_PRICES[service] || 0,
              userId: req.user?.id || null,
            },
          ],
          { session }
        )

        await BookedSlot.insertMany(
          occupiedSlots.map((slot) => ({ slot, booking: created._id })),
          { session, ordered: true }
        )

        booking = created
      })
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ message: 'This slot is already booked' })
      }
      throw err
    } finally {
      await session.endSession()
    }

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
      bookings = await Booking.find().sort({ date: -1 })
    } else {
      bookings = await Booking.find({ userId: req.user.id }).sort({ date: -1 })
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
      (!booking.userId || booking.userId.toString() !== req.user.id)
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

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' })
    }

    // Перевірка прав доступу
    if (
      req.user.role !== 'admin' &&
      booking.userId && // якщо є userId
      booking.userId.toString() !== req.user.id
    ) {
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

    await booking.save()

    if (status === 'canceled') {
      await BookedSlot.deleteMany({ booking: booking._id })
    }

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
      (!booking.userId || booking.userId.toString() !== req.user.id)
    ) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    await Booking.findByIdAndDelete(req.params.id)
    await BookedSlot.deleteMany({ booking: booking._id })
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
      status: { $ne: 'canceled' },
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
