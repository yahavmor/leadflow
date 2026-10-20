import { Server } from 'socket.io'
import { COOKIE_NAME, verifyToken } from './auth.service.js'
import { logger } from './logger.service.js'

function readCookie(header = '', name) {
  const part = header.split(';').map((s) => s.trim()).find((s) => s.startsWith(name + '='))
  return part ? decodeURIComponent(part.slice(name.length + 1)) : null
}

/**
 * Every logged-in browser joins a private room for its user, so a lead that arrives
 * through the webhook shows up on the board right away.
 */
export function createSocketServer(httpServer, { corsOrigin } = {}) {
  const io = new Server(httpServer, { cors: corsOrigin ? { origin: corsOrigin, credentials: true } : undefined })

  io.use((socket, next) => {
    const payload = verifyToken(readCookie(socket.handshake.headers.cookie, COOKIE_NAME))
    if (!payload) return next(new Error('unauthorized'))
    socket.data.userId = payload._id
    next()
  })

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`)
    logger.debug(`socket connected for user ${socket.data.userId}`)
  })

  const emit = (userId, event, data) => io.to(`user:${userId}`).emit(event, data)
  return { io, emit }
}
