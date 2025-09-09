import express from 'express'
import homeRouters from './routes/homeRouters.js'
import userRouters from './routes/userRoutes.js'
import bookingRouters from './routes/bookingRoutes.js'
import './config/db.js'

const app = express()
app.use(express.json())
app.use('/', homeRouters)
app.use('/users', userRouters)
app.use('/bookings', bookingRouters)

const PORT = 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
