import express from 'express'
import { submitBooking } from '../controllers/contactController.js'

const router = express.Router()

router.post('/bookings', submitBooking)

export default router
