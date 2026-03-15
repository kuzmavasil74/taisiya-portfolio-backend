import Booking from './models/Booking.js'
import TelegramBot from 'node-telegram-bot-api'
import mongoose from 'mongoose'

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err))

const CHECK_INTERVAL = 60 * 60 * 1000 // 1 година
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true })

// ===== Обробка натискання кнопок =====
bot.on('callback_query', async (query) => {
  const [action, bookingId] = query.data.split('_')
  const chatId = query.message.chat.id
  const messageId = query.message.message_id

  const booking = await Booking.findById(bookingId)
  if (!booking) return

  let text = ''
  if (action === 'confirm') {
    booking.status = 'confirmed'
    await booking.save()
    text = 'Запис підтверджено ✅'
  }

  if (action === 'cancel') {
    booking.status = 'canceled'
    await booking.save()
    text = 'Запис скасовано ❌'
  }

  if (action === 'postpone') {
    booking.date = new Date(booking.date.getTime() + 30 * 60 * 1000)
    await booking.save()
    text = 'Запис відкладено на 30 хв ⏰'
  }

  // Прибираємо кнопки після натискання
  await bot.editMessageReplyMarkup(
    { inline_keyboard: [] },
    { chat_id: chatId, message_id: messageId }
  )

  // Показуємо коротке повідомлення-підтвердження
  await bot.answerCallbackQuery(query.id, { text })
})

// ===== Функція нагадувань =====
async function checkReminders() {
  const now = new Date()

  try {
    const bookings = await Booking.find({
      status: { $ne: 'canceled' },
      date: { $gte: now },
      $or: [{ reminderDaySent: false }, { reminderHourSent: false }],
    })

    for (const booking of bookings) {
      if (!booking.userId) continue
      const meetingTime = new Date(booking.date)

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

      // Нагадування за день
      const dayBefore = new Date(meetingTime.getTime() - 24 * 60 * 60 * 1000)
      if (!booking.reminderDaySent && now >= dayBefore) {
        await bot.sendMessage(
          booking.userId,
          `Нагадування ✨\nУ вас запис до перукаря завтра\n🕒 ${meetingTime.toLocaleTimeString(
            [],
            { hour: '2-digit', minute: '2-digit' }
          )}\n💇‍♀️ Послуга: ${booking.service}\nДо зустрічі!`,
          keyboard
        )
        booking.reminderDaySent = true
        await booking.save()
      }

      // Нагадування за годину
      const hourBefore = new Date(meetingTime.getTime() - 60 * 60 * 1000)
      if (!booking.reminderHourSent && now >= hourBefore) {
        await bot.sendMessage(
          booking.userId,
          `Нагадування ⏰\nЧерез годину у вас запис\n🕒 ${meetingTime.toLocaleTimeString(
            [],
            { hour: '2-digit', minute: '2-digit' }
          )}\n💇‍♀️ Послуга: ${booking.service}`,
          keyboard
        )
        booking.reminderHourSent = true
        await booking.save()
      }
    }
  } catch (error) {
    console.error('Error checking reminders:', error)
  }
}

// ===== Таймер =====
setInterval(checkReminders, CHECK_INTERVAL)
checkReminders()
