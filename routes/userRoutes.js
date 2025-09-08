import express from 'express'
import { createUser } from '../controllers/userController.js'
import { getUsers } from '../controllers/userController.js'
import { getUsersById } from '../controllers/userController.js'
import { updateUser } from '../controllers/userController.js'
import { deleteUser } from '../controllers/userController.js'

const router = express.Router()
router.post('/', createUser)
router.get('/', getUsers)
router.get('/:id', getUsersById)
router.put('/:id', updateUser)
router.delete('/:id', deleteUser)

export default router
