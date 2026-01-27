import express from 'express'
import dotenv from 'dotenv'
import morgan from 'morgan'
import cors from 'cors'

import homeRouters from './routes/homeRouters.js'
import userRouters from './routes/userRouters.js'
import bookingRouters from './routes/bookingRouters.js'
import authRouters from './routes/authRouters.js'
import adminRouters from './routes/adminRouters.js'
import { errorHandler } from './middleware/errorHandler.js'
import './config/db.js'

dotenv.config()

const app = express()
// CORS middleware
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://[::1]:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
)
// Body parser
app.use(express.json())
app.use(morgan('dev'))
// Public route
app.use('/auth', authRouters)
app.use('/', homeRouters)

// Protected route
app.use('/users', userRouters)
app.use('/bookings', bookingRouters)
app.use('/admin', adminRouters)
app.use(errorHandler)

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
