import { COOKIE_NAME, verifyToken } from '../services/auth.service.js'

export function requireAuth(req, res, next) {
  const payload = verifyToken(req.cookies?.[COOKIE_NAME])
  if (!payload) return res.status(401).json({ error: 'Please log in' })
  req.userId = payload._id
  next()
}
