import express from 'express'
import homeFunction from '../controllers/homeControllers.js'

const router = express.Router()

router.get('/', homeFunction)

export default router
