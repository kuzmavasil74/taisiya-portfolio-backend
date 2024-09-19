import express from 'express'
import connectDB from './config/dbConfig.js'
import 'dotenv/config'
import contactRoutes from './routes/contactRoutes.js'

const app = express()

// Middleware
app.use(express.json()) // Для парсингу JSON в запитах

// Підключення до бази даних
connectDB()

// Routes
app.use('/api', contactRoutes)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
