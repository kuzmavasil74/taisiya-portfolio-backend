import Booking from './models/Booking.js'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import bot from './telegramBot.js'
dotenv.config()

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err))

const CHECK_INTERVAL = 5 * 60 * 1000 // перевірка кожні 5 хв

// --- Функція перевірки нагадувань ---
async function checkReminders() {
  const now = new Date()
  console.log('NOW:', now)

  try {
    const bookings = await Booking.find({
      status: { $ne: 'canceled' },
      date: { $gte: now },
      $or: [{ reminderDaySent: false }, { reminderHourSent: false }],
    })

    console.log('Bookings found:', bookings.length)

    for (const booking of bookings) {
      if (!booking.userId) continue

      const meetingTime = new Date(booking.date)
      const meetingTimeStr = meetingTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Prague',
      })

      const dayBefore = new Date(meetingTime.getTime() - 24 * 60 * 60 * 1000)
      const hourBefore = new Date(meetingTime.getTime() - 60 * 60 * 1000)

      console.log('Booking time:', meetingTime)
      console.log('Day before:', dayBefore)
      console.log('Hour before:', hourBefore)

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Прийду', callback_data: `confirm_${booking._id}` },
              { text: '❌ Скасувати', callback_data: `cancel_${booking._id}` },
            ],
            [
              {
                text: '⏰ Відкласти на 30 хв',
                callback_data: `postpone_${booking._id}`,
              },
            ],
          ],
        },
      }

      // --- Нагадування за день ---
      if (!booking.reminderDaySent && now >= dayBefore) {
        try {
          await bot.sendMessage(
            booking.userId,
            `Нагадування ✨\nУ вас запис до перукаря завтра\n🕒 ${meetingTimeStr}\n💇‍♀️ Послуга: ${booking.service}\nДо зустрічі!`,
            keyboard
          )
          booking.reminderDaySent = true
          await booking.save()
        } catch (err) {
          console.error(
            `Cannot send day reminder to ${booking.userId}:`,
            err.message
          )
        }
      }

      // --- Нагадування за годину ---
      if (!booking.reminderHourSent && now >= hourBefore) {
        try {
          await bot.sendMessage(
            booking.userId,
            `Нагадування ⏰\nЧерез годину у вас запис\n🕒 ${meetingTimeStr}\n💇‍♀️ Послуга: ${booking.service}`,
            keyboard
          )
          booking.reminderHourSent = true
          await booking.save()
        } catch (err) {
          console.error(
            `Cannot send hour reminder to ${booking.userId}:`,
            err.message
          )
        }
      }
    }
  } catch (error) {
    console.error('Error checking reminders:', error)
  }
}

// --- Тестове нагадування ---
bot.onText(/\/testReminder/, async (msg) => {
  const chatId = msg.chat.id

  try {
    await bot.sendMessage(
      chatId,
      `🧪 Тестове нагадування

Через годину у вас запис
🕒 10:30
💇‍♀️ Послуга: menHaircuts`
    )
  } catch (err) {
    console.error('Cannot send test reminder:', err.message)
  }
})

// --- Запуск перевірки ---
setInterval(checkReminders, CHECK_INTERVAL)
checkReminders()
console.log('Reminder service started, bot is polling...')
