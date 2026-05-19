import TelegramBot from 'node-telegram-bot-api'
import dotenv from 'dotenv'
import Booking from './models/Booking.js'

dotenv.config()

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) throw new Error('TELEGRAM_BOT_TOKEN не заданий у .env')

const bot = new TelegramBot(token, { polling: false })

// --- Відправка повідомлення про нове бронювання адміну ---
export function sendBookingNotification(booking) {
  const formattedDate = new Date(booking.date)
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
    `Дата: ${formattedDate}`

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Прийду', callback_data: `confirm_${booking._id}` },
          { text: '❌ Скасувати', callback_data: `cancel_${booking._id}` },
        ],
      ],
    },
  }

  bot
    .sendMessage(process.env.TELEGRAM_CHAT_ID, text, keyboard)
    .then(() => console.log('Повідомлення успішно відправлено!'))
    .catch((err) => console.error('Помилка при відправці повідомлення:', err))
}

// --- Підписка на нагадування через /start <bookingId> ---
bot.onText(/\/start (.+)/, async (msg, match) => {
  const bookingId = match[1]
  const telegramId = msg.from.id // це число
  console.log('Підписка на нагадування:', bookingId, telegramId)

  try {
    // оновлюємо telegramId у бронюванні
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { telegramId: telegramId },
      { new: true }
    )

    if (!booking) {
      await bot.sendMessage(telegramId, `❌ Не вдалося знайти бронювання.`)
      return
    }

    // підтвердження підписки
    await bot.sendMessage(
      telegramId,
      `✅ Ви підписані на нагадування для бронювання "${booking.service}"!`
    )
  } catch (err) {
    console.error(err)
    await bot.sendMessage(
      telegramId,
      `❌ Сталася помилка при підписці на нагадування.`
    )
  }
})

// --- Тестове нагадування ---
bot.onText(/\/testReminder/, async (msg) => {
  const chatId = msg.chat.id
  await bot.sendMessage(
    chatId,
    `🧪 Тестове нагадування\n\nЧерез годину у вас запис\n🕒 10:30\n💇‍♀️ Послуга: menHaircuts`
  )
})

// --- Обробка inline кнопок ---
bot.on('callback_query', async (query) => {
  const [action, bookingId] = query.data.split('_')
  const chatId = query.message.chat.id
  const messageId = query.message.message_id

  const booking = await Booking.findById(bookingId)
  if (!booking) return

  if (action === 'confirm') booking.status = 'confirmed'
  if (action === 'cancel') booking.status = 'canceled'

  await booking.save()

  // очищаємо клавіатуру після натискання
  await bot.editMessageReplyMarkup(
    { inline_keyboard: [] },
    { chat_id: chatId, message_id: messageId }
  )
  await bot.answerCallbackQuery(query.id, { text: `Натиснуто: ${action}` })
})
if (process.env.ENABLE_BOT_POLLING === 'true') {
  bot.startPolling()
}
export default bot
