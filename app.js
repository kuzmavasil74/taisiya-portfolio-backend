import express from 'express'
import connectDB from './config/db.js'
import bookingRoutes from './routers/bookingRoutes.js'
import feedbackRoutes from './routers/feedbackRoutes.js'

const app = express()

// Middleware
app.use(express.json())

// Routes
app.use('/api/bookings', bookingRoutes)
app.use('/api/feedbacks', feedbackRoutes)

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.message)
  res.status(500).json({ message: 'Internal server error' })
})

export default app
