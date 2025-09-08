import express from 'express'
import homeRouters from './routes/homeRouters.js'
import userRouters from './routes/userRoutes.js'
import './config/db.js'

const app = express()
app.use(express.json())
app.use('/', homeRouters)
app.use('/users', userRouters)

const PORT = 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
