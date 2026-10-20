import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { config } from '../config.js'
import { wrap } from '../middlewares/errorHandler.js'
import { requireAuth } from '../middlewares/requireAuth.js'
import { COOKIE_NAME, cookieOptions, signToken, toPublicUser } from '../services/auth.service.js'

const signupSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(8).max(100),
})
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(100),
})

export function authRoutes({ authService, store, onDemoLogin }) {
  const router = Router()
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false })

  const startSession = (res, user) => {
    res.cookie(COOKIE_NAME, signToken(user), cookieOptions())
    res.json(toPublicUser(user))
  }

  router.post('/signup', limiter, wrap(async (req, res) => {
    const user = await authService.signup(signupSchema.parse(req.body))
    res.status(201)
    startSession(res, user)
  }))

  router.post('/login', limiter, wrap(async (req, res) => {
    startSession(res, await authService.login(loginSchema.parse(req.body)))
  }))

  router.post('/demo', limiter, wrap(async (req, res) => {
    if (!config.demoMode) return res.status(404).json({ error: 'Demo mode is off' })
    const user = await authService.getDemoUser()
    await onDemoLogin?.(user)
    startSession(res, user)
  }))

  router.post('/logout', (req, res) => {
    const { httpOnly, sameSite, secure } = cookieOptions()
    res.clearCookie(COOKIE_NAME, { httpOnly, sameSite, secure })
    res.json({ ok: true })
  })

  router.get('/me', requireAuth, wrap(async (req, res) => {
    const user = await store.findUserById(req.userId)
    if (!user) return res.status(401).json({ error: 'Please log in' })
    res.json(toPublicUser(user))
  }))

  router.post('/hook-token', requireAuth, wrap(async (req, res) => {
    res.json(toPublicUser(await authService.rotateHookToken(req.userId)))
  }))

  return router
}
