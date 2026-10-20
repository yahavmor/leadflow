/**
 * Creates (or resets) the demo account with a sample pipeline.
 * Usage: MONGO_URL=... npm run seed
 */
import { createStore } from '../store/index.js'
import { createAuthService } from '../services/auth.service.js'
import { resetDemo } from '../lib/demoData.js'

const store = createStore()
await store.connect()
const user = await createAuthService({ store }).getDemoUser()
await resetDemo(store, user)
console.log(`Demo data ready for ${user.email} (${store.kind} store)`)
await store.close()
