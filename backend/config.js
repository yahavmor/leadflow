// load backend/.env when it exists (Node 20.12+), no dotenv needed
try {
  process.loadEnvFile?.()
} catch {
  /* no .env file: use the real environment */
}

const isProd = process.env.NODE_ENV === 'production'

if (isProd && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production')
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 3030,
  // "mongo" when a connection string is present, otherwise an in-memory store (dev, tests, quick try-out)
  store: process.env.STORE || (process.env.MONGO_URL ? 'mongo' : 'memory'),
  mongoUrl: process.env.MONGO_URL,
  dbName: process.env.DB_NAME || 'leadflow',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:3030',
  demoMode: process.env.DEMO_MODE === 'true',
  demoEmail: 'demo@leadflow.dev',
}
