import express from 'express'
import { getAdminStats } from '../controllers/adminController.js'
import { auth } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import { getUsers } from '../controllers/userController.js'
const router = express.Router()

router.get('/stats', auth, requireRole('admin'), getAdminStats)
router.get('/users', auth, requireRole('admin'), getUsers)
export default router
