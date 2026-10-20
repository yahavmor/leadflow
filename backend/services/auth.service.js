import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'node:crypto'
import { config } from '../config.js'
import { HttpError, unauthorized } from '../lib/errors.js'

export const COOKIE_NAME = 'loginToken'
const TOKEN_TTL = '7d'

export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000,
})

export const newHookToken = () => randomBytes(18).toString('base64url')

/** What the client is allowed to see about a user. */
export const toPublicUser = (u) => u && { _id: u._id, name: u.name, email: u.email, hookToken: u.hookToken, isDemo: !!u.isDemo }

export function signToken(user) {
  return jwt.sign({ _id: user._id }, config.jwtSecret, { expiresIn: TOKEN_TTL })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret)
  } catch {
    return null
  }
}

export function createAuthService({ store }) {
  return {
    async signup({ name, email, password }) {
      const existing = await store.findUserByEmail(email)
      if (existing) throw new HttpError(409, 'An account with this email already exists')
      const passwordHash = await bcrypt.hash(password, 10)
      return store.createUser({ name, email, passwordHash, hookToken: newHookToken() })
    },

    async login({ email, password }) {
      const user = await store.findUserByEmail(email)
      const ok = user && (await bcrypt.compare(password, user.passwordHash))
      if (!ok) throw unauthorized('Wrong email or password')
      return user
    },

    async rotateHookToken(userId) {
      return store.updateUser(userId, { hookToken: newHookToken() })
    },

    /** The demo account is created on first use; its data is reset by the seed routine. */
    async getDemoUser() {
      const existing = await store.findUserByEmail(config.demoEmail)
      if (existing) return existing
      const passwordHash = await bcrypt.hash(randomBytes(24).toString('hex'), 10)
      return store.createUser({ name: 'Demo User', email: config.demoEmail, passwordHash, hookToken: newHookToken(), isDemo: true })
    },
  }
}
