import express from 'express'
import {
  createBooking,
  getAvailableSlots,
  getBookingPaginated,
} from '../controllers/bookingController.js'
import { getBooking } from '../controllers/bookingController.js'
import { getBookingById } from '../controllers/bookingController.js'
import { updateBooking } from '../controllers/bookingController.js'
import { deleteBooking } from '../controllers/bookingController.js'
import { validate } from '../middleware/validate.js'
import { bookingSchema } from '../validation/bookingValidator.js'
import { bookingUpdateSchema } from '../validation/bookingValidator.js'
import { validateObjectId } from '../middleware/validateObjectId.js'
import { auth } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
const router = express.Router()
router.post('/', validate(bookingSchema), createBooking)
router.get('/all', auth, getBooking)
router.get('/available-slots', getAvailableSlots)
router.get('/', auth, requireRole('admin'), getBookingPaginated)
router.get('/available-slots', getAvailableSlots)
router.get('/:id', auth, validateObjectId('id'), getBookingById)
router.put(
  '/:id',
  auth,
  validateObjectId('id'),
  validate(bookingUpdateSchema),
  updateBooking
)
router.delete('/:id', auth, validateObjectId('id'), deleteBooking)

export default router
