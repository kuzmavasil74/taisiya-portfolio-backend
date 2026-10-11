import mongoose from 'mongoose'
import Booking from '../models/Booking.js'
import BookedSlot from '../models/BookedSlot.js'
import Waitlist from '../models/Waitlist.js'
import User from '../models/User.js'
import { DateTime, Interval } from 'luxon'
import {
  TIMEZONE,
  SLOT_INTERVAL,
  BUFFER_MINUTES,
  OPEN_HOUR,
  CLOSE_HOUR,
  WORKING_WEEKDAYS,
  validateBookingTime,
} from '../utils/schedule.js'
import {
  sendBookingNotification,
  notifyWaitlistForDate,
} from '../telegramBot.js'

const POINTS_PER_CZK = 100 // 1 бал лояльності за кожні 100 CZK
const REFERRAL_BONUS_POINTS = 50 // нараховується обом після першого запису запрошеного

// Зменшує бали, не опускаючи нижче нуля
const deductPoints = (userId, amount) =>
  User.updateOne({ _id: userId }, [
    { $set: { points: { $max: [0, { $subtract: ['$points', amount] }] } } },
  ])

// Забирає раніше нараховані за запис бали (лише один раз)
const revokeBookingPoints = async (bookingId) => {
  const prev = await Booking.findOneAndUpdate(
    { _id: bookingId, pointsAwarded: { $gt: 0 } },
    { pointsAwarded: 0 }
  )
  if (prev && prev.userId) await deductPoints(prev.userId, prev.pointsAwarded)
}

// Реферальний бонус: нараховується обом лише після першого запису запрошеного,
// а не за саму реєстрацію — інакше його можна фармити фейковими акаунтами.
const rewardReferral = async (userId) => {
  const invitee = await User.findOneAndUpdate(
    { _id: userId, referredBy: { $ne: null }, referralRewarded: false },
    { referralRewarded: true, $inc: { points: REFERRAL_BONUS_POINTS } }
  )
  if (invitee) {
    await User.updateOne(
      { _id: invitee.referredBy },
      { $inc: { points: REFERRAL_BONUS_POINTS } }
    )
  }
}

// Список дат-меж 30-хвилинних слотів, які займає бронювання цієї тривалості
// (включно з буферним часом після послуги, округленим до слоту).
const getOccupiedSlots = (start, durationMinutes) => {
  const totalMinutes =
    Math.ceil((durationMinutes + BUFFER_MINUTES) / SLOT_INTERVAL) *
    SLOT_INTERVAL
  const slots = []
  for (let m = 0; m < totalMinutes; m += SLOT_INTERVAL) {
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
  // Пакетні пропозиції (комбо зі знижкою)
  cutAndToning: 120,
  balayageAndToning: 240,
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
  // Пакетні пропозиції (комбо зі знижкою відносно суми окремих послуг)
  cutAndToning: 1400, // womenHaircut (600) + toning (1000) окремо = 1600
  balayageAndToning: 3400, // balayage (2800) + toning (1000) окремо = 3800
}

const PACKAGE_KEYS = ['cutAndToning', 'balayageAndToning']

// GET SERVICES (єдине джерело правди для тривалості/ціни послуг)
export const getServices = async (req, res) => {
  const services = Object.keys(SERVICE_DURATIONS).map((key) => ({
    key,
    duration: SERVICE_DURATIONS[key],
    price: SERVICE_PRICES[key] || 0,
    isPackage: PACKAGE_KEYS.includes(key),
  }))
  res.json(services)
}

// CREATE BOOKING
export const createBooking = async (req, res) => {
  try {
    const { name, phone, telegram, service, date, duration, recurringGroupId } =
      req.body

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
    const timeError = validateBookingTime(bookingStart, Number(duration))
    if (timeError) return res.status(400).json({ message: timeError })

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
              recurringGroupId: recurringGroupId || null,
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

    // Бали лояльності — тільки для зареєстрованих клієнтів
    if (req.user?.id) {
      const earnedPoints = Math.floor(booking.price / POINTS_PER_CZK)
      Promise.all([
        earnedPoints > 0
          ? Promise.all([
              User.findByIdAndUpdate(req.user.id, {
                $inc: { points: earnedPoints },
              }),
              Booking.findByIdAndUpdate(booking._id, {
                pointsAwarded: earnedPoints,
              }),
            ])
          : null,
        rewardReferral(req.user.id),
      ]).catch((err) => console.error('Failed to award points:', err))
    }

    return res.status(201).json(booking)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Server error' })
  }
}

// JOIN WAITLIST — коли на потрібну дату немає вільних слотів
export const joinWaitlist = async (req, res) => {
  try {
    const { name, phone, telegram, service, date } = req.body
    if (!name || !phone || !service || !date) {
      return res
        .status(400)
        .json({ message: 'All required fields must be filled' })
    }

    if (!SERVICE_DURATIONS[service]) {
      return res.status(400).json({ message: 'Invalid service' })
    }
    if (new Date(date) <= new Date()) {
      return res.status(400).json({ message: 'Date must be in the future' })
    }

    const entry = await Waitlist.create({
      name,
      phone,
      telegram,
      service,
      date: new Date(date),
      userId: req.user?.id || null,
    })

    return res.status(201).json(entry)
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

// Переносить бронювання: звільняє старі слоти й атомарно займає нові
const reserveSlots = async (booking, start, duration) => {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      await BookedSlot.deleteMany({ booking: booking._id }, { session })
      await BookedSlot.insertMany(
        getOccupiedSlots(start, duration).map((slot) => ({
          slot,
          booking: booking._id,
        })),
        { session, ordered: true }
      )
    })
  } finally {
    await session.endSession()
  }
}

// UPDATE BOOKING
export const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' })
    }

    const isAdmin = req.user.role === 'admin'

    // Перевірка прав доступу: клієнт може змінювати лише власні записи
    if (!isAdmin && (!booking.userId || booking.userId.toString() !== req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const { name, phone, telegram, service, date, status } = req.body

    // Клієнт може лише скасувати запис; редагує й підтверджує тільки адмін
    if (
      !isAdmin &&
      (name || phone || telegram || service || date || status !== 'canceled')
    ) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const wasCanceled = booking.status === 'canceled'
    const nextStatus =
      status && ['pending', 'confirmed', 'canceled'].includes(status)
        ? status
        : booking.status
    const nextService = service || booking.service
    const nextDate = date ? new Date(date) : booking.date

    const scheduleChanged =
      nextService !== booking.service ||
      nextDate.getTime() !== new Date(booking.date).getTime()
    const reactivated = wasCanceled && nextStatus !== 'canceled'

    if (nextStatus !== 'canceled' && (scheduleChanged || reactivated)) {
      if (!SERVICE_DURATIONS[nextService]) {
        return res.status(400).json({ message: 'Invalid service' })
      }
      const nextDuration = SERVICE_DURATIONS[nextService]
      const timeError = validateBookingTime(nextDate, nextDuration, {
        allowPast: reactivated && !scheduleChanged,
      })
      if (timeError) return res.status(400).json({ message: timeError })

      try {
        await reserveSlots(booking, nextDate, nextDuration)
      } catch (err) {
        if (err.code === 11000) {
          return res.status(409).json({ message: 'This slot is already booked' })
        }
        throw err
      }
      booking.service = nextService
      booking.date = nextDate
      booking.duration = nextDuration
      booking.price = SERVICE_PRICES[nextService] || 0
    }

    if (name) booking.name = name
    if (phone) booking.phone = phone
    if (telegram) booking.telegram = telegram
    booking.status = nextStatus

    await booking.save()

    if (nextStatus === 'canceled' && !wasCanceled) {
      await BookedSlot.deleteMany({ booking: booking._id })
      await revokeBookingPoints(booking._id)
      notifyWaitlistForDate(booking.date)
    }

    return res.status(200).json(booking)
  } catch (err) {
    console.error('Server error in updateBooking:', err)
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
      (!booking.userId || booking.userId.toString() !== req.user.id)
    ) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    await revokeBookingPoints(booking._id)
    await Booking.findByIdAndDelete(req.params.id)
    await BookedSlot.deleteMany({ booking: booking._id })
    notifyWaitlistForDate(booking.date)
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
    const tz = TIMEZONE
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
    const { date } = req.query
    if (!date) return res.status(400).json({ message: 'Date is required' })

    // Локальний час для Прази
    const tz = TIMEZONE

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

    // Вихідні дні — слотів немає
    if (!WORKING_WEEKDAYS.includes(day.weekday)) return res.json([])

    for (let hour = OPEN_HOUR; hour < CLOSE_HOUR; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const slotStart = day.set({ hour, minute: min, second: 0 })
        const slotEnd = slotStart.plus({ minutes: 30 })

        // Перевірка на конфлікт з існуючими бронюваннями
        const conflict = bookings.some((b) => {
          const bStart = DateTime.fromJSDate(new Date(b.date), { zone: tz })
          const bEnd = bStart.plus({ minutes: b.duration + BUFFER_MINUTES })
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
