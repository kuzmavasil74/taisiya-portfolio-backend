import express from 'express'
import dotenv from 'dotenv'
import morgan from 'morgan'
import cors from 'cors'

import userRoutes from './routes/userRoutes.js'
import bookingRoutes from './routes/bookingRoutes.js'
import authRoutes from './routes/authRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import feedbackRoutes from './routes/feedbackRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'
import './config/db.js'

dotenv.config()

const app = express()
// Render стоїть за проксі — потрібно для коректного IP у rate limiter
app.set('trust proxy', 1)
// CORS middleware
app.use(
  cors({
    origin: [
      'https://www.taisiiastyle.cz',
      'https://taisiiastyle.cz',
      'http://localhost:3000',
      'http://localhost:4000',
      // додаткові origin через кому (наприклад, Railway-домен фронтенду)
      ...(process.env.CORS_ORIGINS || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
)
// Body parser
app.use(express.json())
app.use(morgan('dev'))
// Healthcheck для хостингу (без звернення до БД)
app.get('/health', (req, res) => res.json({ status: 'ok' }))

// Public route
app.use('/auth', authRoutes)

// Protected route
app.use('/users', userRoutes)
app.use('/bookings', bookingRoutes)
app.use('/admin', adminRoutes)
app.use('/feedback', feedbackRoutes)
app.use(errorHandler)

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
