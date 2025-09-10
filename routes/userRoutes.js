import express from 'express'
import { createUser } from '../controllers/userController.js'
import { getUsers } from '../controllers/userController.js'
import { getUsersById } from '../controllers/userController.js'
import { updateUser } from '../controllers/userController.js'
import { deleteUser } from '../controllers/userController.js'
import { validate } from '../middleware/validate.js'
import { userSchema } from '../validation/userValidator.js'
import { updateSchema } from '../validation/userValidator.js'

const router = express.Router()
router.post('/', validate(userSchema), createUser)
router.get('/', getUsers)
router.get('/:id', getUsersById)
router.put('/:id', validate(updateSchema), updateUser)
router.delete('/:id', deleteUser)

export default router
