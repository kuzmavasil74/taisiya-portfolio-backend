import express from 'express'
import homeRouters from './routes/homeRouters.js'
import userRouters from './routes/userRoutes.js'
import bookingRouters from './routes/bookingRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/authRoutes.js'
import './config/db.js'
import dotenv from 'dotenv'
import morgan from 'morgan'
import cors from 'cors'

dotenv.config()

const app = express()
app.use(express.json())
app.use(morgan('dev'))
app.use(cors())
app.use('/', homeRouters)
app.use('/users', userRouters)
app.use('/bookings', bookingRouters)
app.use('/auth', authRoutes)

app.use(errorHandler)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
