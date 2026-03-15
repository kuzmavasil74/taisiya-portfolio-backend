bot.onText(/\/test/, async (msg) => {
  const chatId = msg.chat.id

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Прийду', callback_data: 'confirm_test' },
          { text: '❌ Скасувати', callback_data: 'cancel_test' },
        ],
        [{ text: '⏰ Відкласти на 30 хв', callback_data: 'postpone_test' }],
      ],
    },
  }

  await bot.sendMessage(
    chatId,
    `Тестове нагадування ✨\n🕒 Через хвилину\n💇‍♀️ Послуга: Тестова`,
    keyboard
  )
})
