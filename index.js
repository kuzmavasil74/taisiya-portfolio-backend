import express from 'express'
import homeRouters from './routes/homeRouters.js'
import './config/db.js'
const app = express()

app.use('/', homeRouters)

const PORT = 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
