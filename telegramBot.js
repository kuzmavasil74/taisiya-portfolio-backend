import TelegramBot from 'node-telegram-bot-api'
import dotenv from 'dotenv'
import { DateTime } from 'luxon'
import Booking from './models/Booking.js'
import BookedSlot from './models/BookedSlot.js'
import Waitlist from './models/Waitlist.js'

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
      timeZone: 'Europe/Prague',
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

// --- Сповіщення адміну, що клієнт зі списку очікування може зайняти
//     звільнений день ---
function notifyWaitlistEntry(entry) {
  const text =
    `📋 Звільнився день у списку очікування!\n` +
    `Ім'я: ${entry.name}\n` +
    `Телефон: ${entry.phone}\n` +
    `Послуга: ${entry.service}\n` +
    `Бажана дата: ${new Date(entry.date).toLocaleDateString('uk-UA', {
      timeZone: 'Europe/Prague',
    })}`

  bot
    .sendMessage(process.env.TELEGRAM_CHAT_ID, text)
    .catch((err) =>
      console.error('Помилка сповіщення списку очікування:', err)
    )
}

// --- Перевіряє список очікування на конкретний день і сповіщає адміна ---
export async function notifyWaitlistForDate(date) {
  try {
    const tz = 'Europe/Prague'
    const day = DateTime.fromJSDate(new Date(date), { zone: tz })
    const dayStart = day.startOf('day').toJSDate()
    const dayEnd = day.endOf('day').toJSDate()

    const entries = await Waitlist.find({
      date: { $gte: dayStart, $lte: dayEnd },
      notified: false,
    })

    for (const entry of entries) {
      notifyWaitlistEntry(entry)
      entry.notified = true
      await entry.save()
    }
  } catch (err) {
    console.error('Failed to notify waitlist:', err)
  }
}

// --- Підписка на нагадування через /start <bookingId> ---
bot.onText(/\/start (.+)/, async (msg, match) => {
  const bookingId = match[1]
  const telegramId = msg.from.id // це число

  try {
    const booking = await Booking.findById(bookingId)

    if (!booking) {
      await bot.sendMessage(telegramId, `❌ Не вдалося знайти бронювання.`)
      return
    }

    // Якщо на це бронювання вже підписаний інший Telegram-акаунт —
    // не даємо перехопити чужі нагадування.
    if (booking.telegramId && booking.telegramId !== telegramId) {
      await bot.sendMessage(
        telegramId,
        `❌ Це бронювання вже прив'язане до іншого акаунту Telegram.`
      )
      return
    }

    booking.telegramId = telegramId
    await booking.save()

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

  if (action === 'cancel') {
    await BookedSlot.deleteMany({ booking: booking._id })
    notifyWaitlistForDate(booking.date)
  }

  // очищаємо клавіатуру після натискання
  await bot.editMessageReplyMarkup(
    { inline_keyboard: [] },
    { chat_id: chatId, message_id: messageId }
  )
  await bot.answerCallbackQuery(query.id, { text: `Натиснуто: ${action}` })
})
// Polling має бути запущений рівно один раз і лише в одному екземплярі —
// інакше Telegram повертає 409 Conflict (getUpdates скасовують один одного).
if (process.env.ENABLE_BOT_POLLING === 'true') {
  bot.startPolling()
  console.log('Bot polling started')
}
export default bot
