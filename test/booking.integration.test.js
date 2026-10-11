import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { DateTime } from 'luxon'
import { MongoMemoryReplSet } from 'mongodb-memory-server'

process.env.JWT_SECRET = 'test-secret'
process.env.TELEGRAM_BOT_TOKEN = '123456:test-token'
process.env.TELEGRAM_CHAT_ID = '1'

let replSet
let server
let base
let User
let Booking
let BookedSlot

const tokenFor = (user, role = 'user') =>
  jwt.sign({ id: user._id, email: user.email, role }, process.env.JWT_SECRET)

// Понеділок через два тижні — гарантовано майбутній робочий день
const monday = (hour, minute = 0) =>
  DateTime.now()
    .setZone('Europe/Prague')
    .plus({ weeks: 2 })
    .startOf('week')
    .set({ hour, minute, second: 0, millisecond: 0 })
    .toUTC()
    .toISO()

const book = (body, token) =>
  fetch(`${base}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      name: 'Anna Test',
      phone: '420123456789',
      service: 'womenHaircut',
      duration: 60,
      ...body,
    }),
  })

const update = (id, body, token) =>
  fetch(`${base}/bookings/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

const makeUser = (extra = {}) =>
  User.create({
    name: 'Client',
    email: `u${Date.now()}${Math.random()}@example.com`,
    password: 'hashed-password',
    ...extra,
  })

// Бали нараховуються асинхронно після відповіді — чекаємо, поки з'являться
const waitFor = async (fn, ms = 3000) => {
  const end = Date.now() + ms
  while (Date.now() < end) {
    const value = await fn()
    if (value) return value
    await new Promise((r) => setTimeout(r, 50))
  }
  return fn()
}

before(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  await mongoose.connect(replSet.getUri('test'))

  const telegram = await import('../telegramBot.js')
  telegram.default.sendMessage = async () => {} // без мережі

  User = (await import('../models/User.js')).default
  Booking = (await import('../models/Booking.js')).default
  BookedSlot = (await import('../models/BookedSlot.js')).default
  await BookedSlot.init() // унікальний індекс має існувати до першого запису

  const { default: bookingRoutes } = await import('../routes/bookingRoutes.js')
  const app = express()
  app.use(express.json())
  app.use('/bookings', bookingRoutes)
  await new Promise((resolve) => {
    server = app.listen(0, resolve)
  })
  base = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()
  await replSet.stop()
})

beforeEach(async () => {
  await Promise.all([
    Booking.deleteMany({}),
    BookedSlot.deleteMany({}),
    User.deleteMany({}),
  ])
})

test('guest can book a valid slot', async () => {
  const res = await book({ date: monday(10) })
  assert.equal(res.status, 201)
  const body = await res.json()
  assert.equal(body.price, 600)
  assert.equal(body.userId, null)
  // 60 хв + 15 хв буфер = 3 слоти по 30 хв
  assert.equal(await BookedSlot.countDocuments(), 3)
})

test('the same slot cannot be booked twice (409)', async () => {
  assert.equal((await book({ date: monday(10) })).status, 201)
  assert.equal((await book({ date: monday(10) })).status, 409)
  assert.equal(await Booking.countDocuments(), 1)
})

test('overlapping slot is rejected, the buffer slot is respected', async () => {
  assert.equal((await book({ date: monday(10) })).status, 201) // 10:00-11:15
  assert.equal((await book({ date: monday(11) })).status, 409)
  assert.equal((await book({ date: monday(11, 30) })).status, 201)
})

test('concurrent requests for one slot produce exactly one booking', async () => {
  const results = await Promise.all(
    Array.from({ length: 5 }, () => book({ date: monday(14) }))
  )
  const statuses = results.map((r) => r.status).sort()
  assert.deepEqual(statuses, [201, 409, 409, 409, 409])
  assert.equal(await Booking.countDocuments(), 1)
})

test('closed day, past date and after-hours bookings are rejected', async () => {
  const tuesday = DateTime.fromISO(monday(10)).plus({ days: 1 }).toISO()
  assert.equal((await book({ date: tuesday })).status, 400)
  assert.equal(
    (await book({ date: '2020-01-06T09:00:00.000Z' })).status,
    400
  )
  assert.equal((await book({ date: monday(19, 30) })).status, 400)
  assert.equal(await Booking.countDocuments(), 0)
})

test('service and duration must match the price list', async () => {
  assert.equal(
    (await book({ date: monday(10), duration: 30 })).status,
    400
  )
  assert.equal(
    (await book({ date: monday(10), service: 'nonsense' })).status,
    400
  )
})

test('logged-in booking is linked to the account and earns points', async () => {
  const user = await makeUser()
  const res = await book({ date: monday(10), service: 'balayage', duration: 180 }, tokenFor(user))
  assert.equal(res.status, 201)
  const body = await res.json()
  assert.equal(body.userId, String(user._id))

  const points = await waitFor(async () => {
    const u = await User.findById(user._id)
    return u.points > 0 ? u.points : null
  })
  assert.equal(points, 28) // 2800 CZK / 100
})

test('an invalid token is treated as a guest, not an error', async () => {
  const res = await book({ date: monday(10) }, 'garbage')
  assert.equal(res.status, 201)
  assert.equal((await res.json()).userId, null)
})

test('canceling revokes points once and frees the slots', async () => {
  const user = await makeUser()
  const token = tokenFor(user)
  const created = await (await book({ date: monday(10) }, token)).json()
  await waitFor(async () => (await User.findById(user._id)).points > 0)
  assert.equal((await User.findById(user._id)).points, 6)

  assert.equal((await update(created._id, { status: 'canceled' }, token)).status, 200)
  assert.equal((await User.findById(user._id)).points, 0)
  assert.equal(await BookedSlot.countDocuments(), 0)

  // повторне скасування не забирає бали вдруге
  await User.updateOne({ _id: user._id }, { points: 10 })
  await update(created._id, { status: 'canceled' }, token)
  assert.equal((await User.findById(user._id)).points, 10)

  // слот знову вільний
  assert.equal((await book({ date: monday(10) })).status, 201)
})

test('clients can only cancel their own bookings and cannot confirm', async () => {
  const owner = await makeUser()
  const other = await makeUser()
  const created = await (await book({ date: monday(10) }, tokenFor(owner))).json()

  assert.equal((await update(created._id, { status: 'canceled' }, tokenFor(other))).status, 403)
  assert.equal((await update(created._id, { status: 'confirmed' }, tokenFor(owner))).status, 403)
  assert.equal((await update(created._id, { name: 'Hacker' }, tokenFor(owner))).status, 403)
  assert.equal((await Booking.findById(created._id)).status, 'pending')
})

test('admin can reschedule; slots move atomically', async () => {
  const admin = await makeUser({ role: 'admin' })
  const created = await (await book({ date: monday(10) })).json()

  const res = await update(created._id, { date: monday(15) }, tokenFor(admin, 'admin'))
  assert.equal(res.status, 200)
  assert.equal(await BookedSlot.countDocuments(), 3)
  assert.equal((await book({ date: monday(10) })).status, 201) // старий час вільний
  assert.equal((await book({ date: monday(15) })).status, 409) // новий зайнятий
})

test('referral bonus is paid to both sides after the first booking only', async () => {
  const referrer = await makeUser({ referralCode: 'friend01' })
  const invitee = await makeUser({ referredBy: referrer._id })
  const token = tokenFor(invitee)

  assert.equal((await User.findById(referrer._id)).points, 0)
  await book({ date: monday(10), service: 'menHaircut', duration: 30 }, token)
  await waitFor(async () => (await User.findById(referrer._id)).points > 0)
  assert.equal((await User.findById(referrer._id)).points, 50)
  // 500 CZK -> 5 балів + 50 бонус
  assert.equal((await User.findById(invitee._id)).points, 55)

  await book({ date: monday(12), service: 'menHaircut', duration: 30 }, token)
  await waitFor(async () => (await User.findById(invitee._id)).points > 55)
  assert.equal((await User.findById(referrer._id)).points, 50) // без повторного бонусу
})
