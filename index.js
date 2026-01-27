import express from 'express'
import dotenv from 'dotenv'
import morgan from 'morgan'
import cors from 'cors'

import homeRoutes from './routes/homeRoutes.js'
import userRoutes from './routes/userRoutes.js'
import bookingRoutes from './routes/bookingRoutes.js'
import authRoutes from './routes/authRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'
import './config/db.js'

dotenv.config()

const app = express()
// CORS middleware
app.use(
  cors({
    origin: [
      'https://www.taisiiastyle.cz',
      'http://localhost:3000',
      'http://localhost:4000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
)
// Body parser
app.use(express.json())
app.use(morgan('dev'))
// Public route
app.use('/auth', authRoutes)
app.use('/', homeRoutes)

// Protected route
app.use('/users', userRoutes)
app.use('/bookings', bookingRoutes)
app.use('/admin', adminRoutes)
app.use(errorHandler)

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
