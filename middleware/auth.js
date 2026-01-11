import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import User from '../models/User.js'
dotenv.config()

export const auth = (req, res, next) => {
  console.log('AUTH MIDDLEWARE')
  console.log(req.method)
  if (req.method === 'OPTIONS') return next()

  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' })
  }
  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log('USER FROM TOKEN:', decoded)
    req.user = {
      id: decoded.id || decoded._id,
      email: decoded.email,
      role: decoded.role,
    }
    next()
  } catch (err) {
    console.error('❌ JWT verification error:', err.message)
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}
