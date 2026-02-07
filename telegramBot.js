import TelegramBot from 'node-telegram-bot-api'
import dotenv from 'dotenv'

dotenv.config()

// Отримуємо токен та chatId з .env
const token = process.env.TELEGRAM_BOT_TOKEN
const chatId = process.env.TELEGRAM_CHAT_ID

// Перевірка, чи є токен і chatId
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN не заданий у .env')
}

if (!chatId) {
  throw new Error('TELEGRAM_CHAT_ID не заданий у .env')
}

// Створюємо бот (тільки для відправки повідомлень)
const bot = new TelegramBot(token, { polling: false })

/**
 * Відправка повідомлення про нове бронювання
 * @param {Object} booking - дані бронювання
 * @param {string} booking.name
 * @param {string} booking.phone
 * @param {string} booking.service
 * @param {string} booking.date
 */
export function sendBookingNotification(booking) {
  const text =
    `Нове бронювання!\n` +
    `Ім’я: ${booking.name}\n` +
    `Телефон: ${booking.phone}\n` +
    `Послуга: ${booking.service}\n` +
    `Дата: ${booking.date}`

  bot
    .sendMessage(chatId, text)
    .then(() => console.log('Повідомлення успішно відправлено!'))
    .catch((err) => console.error('Помилка при відправці повідомлення:', err))
}

export default bot
