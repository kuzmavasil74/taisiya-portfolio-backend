import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DateTime } from 'luxon'
import { validateBookingTime, TIMEZONE } from '../utils/schedule.js'

// Фіксований "зараз": неділя 5 січня 2025, 12:00 за Прагою
const now = DateTime.fromISO('2025-01-05T12:00:00', { zone: TIMEZONE })
const at = (iso) => DateTime.fromISO(iso, { zone: TIMEZONE }).toJSDate()
const check = (iso, minutes, opts = {}) =>
  validateBookingTime(at(iso), minutes, { now, ...opts })

test('accepts a Monday slot inside working hours', () => {
  assert.equal(check('2025-01-06T10:00:00', 60), null)
})

test('accepts Wednesday and Friday', () => {
  assert.equal(check('2025-01-08T09:00:00', 30), null)
  assert.equal(check('2025-01-10T15:30:00', 120), null)
})

test('rejects closed weekdays (Tue, Thu, Sat, Sun)', () => {
  for (const day of ['07', '09', '11', '12']) {
    assert.match(check(`2025-01-${day}T10:00:00`, 60), /closed/)
  }
})

test('rejects past dates', () => {
  assert.match(check('2024-12-30T10:00:00', 60), /future/)
})

test('allowPast skips the past-date check only', () => {
  assert.equal(check('2024-12-30T10:00:00', 60, { allowPast: true }), null)
  assert.match(
    check('2024-12-31T10:00:00', 60, { allowPast: true }),
    /closed/
  )
})

test('rejects start before opening', () => {
  assert.match(check('2025-01-06T08:30:00', 30), /working hours/)
})

test('rejects bookings that end after closing', () => {
  assert.match(check('2025-01-06T19:30:00', 60), /working hours/)
  assert.equal(check('2025-01-06T19:30:00', 30), null)
})

test('rejects times not on a 30-minute boundary', () => {
  assert.match(check('2025-01-06T10:15:00', 30), /30-minute/)
})

test('rejects invalid dates', () => {
  assert.equal(validateBookingTime(new Date('nope'), 30, { now }), 'Invalid date')
})

test('uses Prague time across DST (summer, UTC+2)', () => {
  // 09:00 за Прагою влітку = 07:00 UTC
  const summerNow = DateTime.fromISO('2025-07-01T00:00:00', { zone: TIMEZONE })
  const start = new Date('2025-07-02T07:00:00Z') // середа
  assert.equal(validateBookingTime(start, 30, { now: summerNow }), null)
})
