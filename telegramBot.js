import TelegramBot from 'node-telegram-bot-api'
import dotenv from 'dotenv'
import Booking from './models/Booking.js'

dotenv.config()

const token = process.env.TELEGRAM_BOT_TOKEN
const chatId = process.env.TELEGRAM_CHAT_ID

if (!token) throw new Error('TELEGRAM_BOT_TOKEN не заданий у .env')
if (!chatId) throw new Error('TELEGRAM_CHAT_ID не заданий у .env')

const bot = new TelegramBot(token, { polling: true })

export function sendBookingNotification(booking) {
  const formatedDate = new Date(booking.date)
    .toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(',', ' о')
  const text =
    `Нове бронювання!\n` +
    `Ім’я: ${booking.name}\n` +
    `Телефон: ${booking.phone}\n` +
    `Послуга: ${booking.service}\n` +
    `Дата: ${formatedDate}`

  bot
    .sendMessage(chatId, text)
    .then(() => console.log('Повідомлення успішно відправлено!'))
    .catch((err) => console.error('Помилка при відправці повідомлення:', err))
}

bot.onText(/\/start (.+)/, async (msg, match) => {
  const bookingId = match[1]
  const telegramId = msg.from.id
  console.log('Підписка на нагадування:', bookingId, telegramId)
  console.log('bookingId:', bookingId)
  console.log('telegramId:', telegramId)

  try {
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { userId: telegramId },
      { new: true }
    )

    if (booking) {
      bot.sendMessage(
        telegramId,
        `✅ Ви підписані на нагадування для бронювання "${booking.service}"!`
      )
    } else {
      bot.sendMessage(telegramId, `❌ Не вдалося знайти бронювання.`)
    }
  } catch (err) {
    console.error(err)
    bot.sendMessage(
      telegramId,
      `❌ Сталася помилка при підписці на нагадування.`
    )
  }
})

export default bot
