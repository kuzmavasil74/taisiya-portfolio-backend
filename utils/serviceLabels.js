// Читабельні назви послуг для Telegram-повідомлень (ті самі, що в перекладах
// сайту, uk). У базі зберігається технічний ключ (womenHaircut тощо).
const SERVICE_LABELS = {
  womenHaircut: 'Жіноча стрижка',
  menHaircut: 'Чоловіча стрижка',
  menHaircutBeard: 'Чоловіча стрижка + борода',
  balayage: 'Мелірування / Балаяж',
  airtouch: 'Airtouch',
  exitBlack: 'Вихід із чорного',
  brazilianColoring: 'Бразильське фарбування',
  toning: 'Тонування',
  restorationShort: 'Відновлення (до плечей)',
  restorationMedium: 'Відновлення (до лопаток)',
  restorationLong: 'Відновлення (до пояса)',
  curlingShort: 'Окудрення (до плечей)',
  curlingMedium: 'Окудрення (до лопаток)',
  curlingLong: 'Окудрення (до пояса)',
  cutAndToning: 'Комбо: Жіноча стрижка + Тонування',
  balayageAndToning: 'Комбо: Балаяж + Тонування',
}

// Для невідомого ключа (наприклад, старі записи) показуємо його як є
export const serviceLabel = (key) => SERVICE_LABELS[key] || key
