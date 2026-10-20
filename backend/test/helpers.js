import request from 'supertest'
import { randomUUID } from 'node:crypto'
import { createApp } from '../app.js'
import { createMemoryStore } from '../store/memory.store.js'
import { createMongoStore } from '../store/mongo.store.js'

/**
 * The suite runs against the in-memory store by default.
 * CI runs it again against a real MongoDB: TEST_STORE=mongo MONGO_URL=mongodb://localhost:27017
 */
export async function setup() {
  const store = process.env.TEST_STORE === 'mongo'
    ? createMongoStore({ url: process.env.MONGO_URL, dbName: `leadflow_test_${randomUUID().slice(0, 8)}` })
    : createMemoryStore()
  await store.connect()
  const events = []
  const app = createApp({ store, emit: (userId, event, data) => events.push({ userId, event, data }) })
  const teardown = async () => {
    await store.drop()
    await store.close()
  }
  return { app, store, events, teardown }
}

let n = 0
/** Signs up a fresh user and returns a cookie-carrying agent plus the user. */
export async function signedInAgent(app, name = 'Test User') {
  const agent = request.agent(app)
  n++
  const res = await agent
    .post('/api/auth/signup')
    .send({ name, email: `user${n}.${Date.now()}@test.dev`, password: 'secret-pass-1' })
    .expect(201)
  return { agent, user: res.body }
}
