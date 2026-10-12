import { test } from 'node:test'
import assert from 'node:assert/strict'
import { serviceLabel } from '../utils/serviceLabels.js'

test('known service keys get a readable Ukrainian label', () => {
  assert.equal(serviceLabel('womenHaircut'), 'Жіноча стрижка')
  assert.equal(serviceLabel('cutAndToning'), 'Комбо: Жіноча стрижка + Тонування')
})

test('unknown keys fall back to the raw value', () => {
  assert.equal(serviceLabel('legacyService'), 'legacyService')
})
