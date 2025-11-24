export const requireRole = (role) => (req, res, next) => {
  console.log('User role from token:', req.user.role)
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' })
  if (req.user.role !== role)
    return res.status(403).json({ message: 'Forbidden' })
  next()
}
