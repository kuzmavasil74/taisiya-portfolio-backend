import express from 'express'
import {
  createFeedback,
  getFeedback,
  deleteFeedback,
} from '../controllers/feedbackController.js'
import { auth } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import { feedbackLimiter } from '../middleware/rateLimit.js'
import { validateObjectId } from '../middleware/validateObjectId.js'

const router = express.Router()

router.get('/', getFeedback)
router.post('/', feedbackLimiter, auth, createFeedback)
router.delete(
  '/:id',
  auth,
  requireRole('admin'),
  validateObjectId('id'),
  deleteFeedback
)

export default router
