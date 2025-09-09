import express from 'express'
import { createBooking } from '../controllers/bookingController.js'
import { getBooking } from '../controllers/bookingController.js'
import { getBookingById } from '../controllers/bookingController.js'
import { updateBooking } from '../controllers/bookingController.js'
import { deleteBooking } from '../controllers/bookingController.js'

const router = express.Router()
router.post('/', createBooking)
router.get('/', getBooking)
router.get('/:id', getBookingById)
router.put('/:id', updateBooking)
router.delete('/:id', deleteBooking)

export default router
