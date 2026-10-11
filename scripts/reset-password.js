// Одноразове скидання пароля користувача.
// Використання (значення не потрапляють в історію команд, якщо задати їх у промпті):
//   MONGO_URI="..." NEW_PASSWORD="новий-пароль" node scripts/reset-password.js email@example.com
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'

const email = (process.argv[2] || '').trim().toLowerCase()
const { MONGO_URI, NEW_PASSWORD } = process.env

if (!email || !MONGO_URI || !NEW_PASSWORD) {
  console.error('Потрібні: email аргументом, MONGO_URI і NEW_PASSWORD у середовищі')
  process.exit(1)
}
if (NEW_PASSWORD.length < 6) {
  console.error('Пароль має містити щонайменше 6 символів')
  process.exit(1)
}

try {
  await mongoose.connect(MONGO_URI)
  const user = await User.findOne({ email })
  if (!user) {
    console.error(`Користувача ${email} не знайдено`)
    process.exit(1)
  }
  user.password = await bcrypt.hash(NEW_PASSWORD, await bcrypt.genSalt(10))
  await user.save()
  console.log(`Пароль для ${email} (роль: ${user.role}) змінено`)
} finally {
  await mongoose.disconnect()
}
