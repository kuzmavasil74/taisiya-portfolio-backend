import express from 'express'
import { createBooking } from '../controllers/bookingController.js'
import { getBooking } from '../controllers/bookingController.js'
import { getBookingById } from '../controllers/bookingController.js'
import { updateBooking } from '../controllers/bookingController.js'
import { deleteBooking } from '../controllers/bookingController.js'
import { validate } from '../middleware/validate.js'
import { bookingSchema } from '../validation/bookingValidator.js'
import { bookingUpdateSchema } from '../validation/bookingValidator.js'

const router = express.Router()
router.post('/', validate(bookingSchema), createBooking)
router.get('/', getBooking)
router.get('/:id', getBookingById)
router.put('/:id', validate(bookingUpdateSchema), updateBooking)
router.delete('/:id', deleteBooking)

export default router
