import { config } from '../config.js'
import { createMemoryStore } from './memory.store.js'
import { createMongoStore } from './mongo.store.js'

export function createStore(kind = config.store) {
  if (kind === 'mongo') {
    if (!config.mongoUrl) throw new Error('STORE=mongo requires MONGO_URL')
    return createMongoStore({ url: config.mongoUrl, dbName: config.dbName })
  }
  return createMemoryStore()
}
