import express from 'express'
import { register, login } from '../controllers/authController.js'
import { validate } from '../middleware/validate.js'
import { userSchema } from '../validation/userValidator.js'
import { auth } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import { deleteUser } from '../controllers/userController.js'

const router = express.Router()

router.post('/register', validate(userSchema), register)
router.post('/login', login)
router.delete('/:id', auth, requireRole('admin'), deleteUser)

export default router
