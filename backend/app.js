import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'
import { authRoutes } from './api/auth.routes.js'
import { leadRoutes } from './api/lead.routes.js'
import { hookRoutes } from './api/hook.routes.js'
import { statsRoutes } from './api/stats.routes.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { createAuthService } from './services/auth.service.js'
import { createLeadService } from './services/lead.service.js'
import { resetDemo } from './lib/demoData.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIST = path.resolve(__dirname, '../frontend/dist')

/**
 * Builds the Express app around a store. `emit` pushes real-time events to the
 * user's browsers (a no-op in tests).
 */
export function createApp({ store, emit = () => {} }) {
  const app = express()
  const authService = createAuthService({ store })
  const leadService = createLeadService({ store, emit })

  app.set('trust proxy', 1)
  app.disable('x-powered-by')
  const https = config.publicUrl.startsWith('https://')
  app.use(helmet({
    contentSecurityPolicy: { directives: { upgradeInsecureRequests: https ? [] : null } },
    strictTransportSecurity: https,
  }))
  app.use(cookieParser())

  // the public webhook gets its own CORS, body parsing and rate limit
  app.use('/api/hook', express.json({ limit: '50kb' }), hookRoutes({ leadService, store }))

  app.use(express.json({ limit: '100kb' }))
  if (!config.isProd) app.use('/api', cors({ origin: config.clientOrigin, credentials: true }))

  app.get('/api/health', (req, res) => res.json({ ok: true, store: store.kind }))
  app.use('/api/auth', authRoutes({ authService, store, onDemoLogin: (user) => resetDemo(store, user) }))
  app.use('/api/lead', leadRoutes({ leadService, store }))
  app.use('/api/stats', statsRoutes({ leadService }))
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }))

  // in production the same server hosts the React build
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST, { maxAge: '1h', index: false }))
    app.get('*', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')))
  }

  app.use(errorHandler)
  return app
}
