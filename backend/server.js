import http from 'node:http'
import { config } from './config.js'
import { createApp } from './app.js'
import { createStore } from './store/index.js'
import { createSocketServer } from './services/socket.service.js'
import { logger } from './services/logger.service.js'

const store = createStore()
await store.connect()

let emit = () => {}
const app = createApp({ store, emit: (...args) => emit(...args) })
const server = http.createServer(app)
;({ emit } = createSocketServer(server, { corsOrigin: config.isProd ? undefined : config.clientOrigin }))

server.listen(config.port, () => {
  logger.info(`LeadFlow API on http://localhost:${config.port} (store: ${store.kind}${config.demoMode ? ', demo mode' : ''})`)
})

const shutdown = async () => {
  server.close()
  await store.close()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
