import express from 'express'
import homeRouters from './routes/homeRouters.js'
import userRouters from './routes/userRoutes.js'
import bookingRouters from './routes/bookingRoutes.js'
import authRoutes from './routes/authRoutes.js'
import adminRoutes from './routes/adminRouters.js'
import { errorHandler } from './middleware/errorHandler.js'
import './config/db.js'
import dotenv from 'dotenv'
import morgan from 'morgan'
import cors from 'cors'

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
app.use('/auth', authRoutes)
app.use('/', homeRouters)

// Protected route
app.use('/users', userRouters)
app.use('/bookings', bookingRouters)
app.use('/admin', adminRoutes)
app.use(errorHandler)

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
