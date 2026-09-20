import express from 'express'
import { createFeedback, getFeedback } from '../controllers/feedbackController.js'
import { auth } from '../middleware/auth.js'

const router = express.Router()

router.get('/', getFeedback)
router.post('/', auth, createFeedback)

export default router
