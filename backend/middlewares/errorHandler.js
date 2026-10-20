import { ZodError } from 'zod'
import { logger } from '../services/logger.service.js'

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const issue = err.issues[0]
    return res.status(400).json({ error: `${issue.path.join('.') || 'body'}: ${issue.message}` })
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' })
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message })
  logger.error(req.method, req.originalUrl, err)
  res.status(500).json({ error: 'Something went wrong' })
}

/** Lets async route handlers throw instead of calling next(err) by hand. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
