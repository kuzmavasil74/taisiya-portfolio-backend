import { DateTime } from 'luxon'

export const TIMEZONE = 'Europe/Prague'
export const SLOT_INTERVAL = 30 // хвилини
export const BUFFER_MINUTES = 15 // час на прибирання/підготовку між записами
export const OPEN_HOUR = 9
export const CLOSE_HOUR = 20
// Пн, Ср, Пт (luxon: 1 = понеділок)
export const WORKING_WEEKDAYS = [1, 3, 5]

// Перевіряє, що запис починається в робочий день, у робочі години, по сітці
// 30-хвилинних слотів і закінчується до закриття. Повертає текст помилки
// або null, якщо час допустимий.
export const validateBookingTime = (
  start,
  durationMinutes,
  { now = DateTime.now(), allowPast = false } = {}
) => {
  const dt = DateTime.fromJSDate(start, { zone: TIMEZONE })
  if (!dt.isValid) return 'Invalid date'

  if (!allowPast && dt <= now) return 'Date must be in the future'

  if (!WORKING_WEEKDAYS.includes(dt.weekday)) {
    return 'The salon is closed on this day'
  }

  if (dt.minute % SLOT_INTERVAL !== 0 || dt.second !== 0 || dt.millisecond) {
    return 'Start time must be on a 30-minute boundary'
  }

  const open = dt.set({ hour: OPEN_HOUR, minute: 0, second: 0, millisecond: 0 })
  const close = dt.set({ hour: CLOSE_HOUR, minute: 0, second: 0, millisecond: 0 })
  if (dt < open || dt.plus({ minutes: durationMinutes }) > close) {
    return 'Booking is outside working hours'
  }

  return null
}
