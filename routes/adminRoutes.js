import express from 'express'
import { getAdminStats } from '../controllers/adminController.js'
import { auth } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
const router = express.Router()

router.get('/stats', auth, requireRole('admin'), getAdminStats)
export default router
