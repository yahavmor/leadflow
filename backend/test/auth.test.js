import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { setup, signedInAgent } from './helpers.js'

let ctx
before(async () => { ctx = await setup() })
after(async () => { await ctx.teardown() })

test('signup starts a session and returns a webhook token, never the password hash', async () => {
  const { agent, user } = await signedInAgent(ctx.app, 'Noa')
  assert.equal(user.name, 'Noa')
  assert.ok(user.hookToken.length >= 20)
  assert.equal(user.passwordHash, undefined)
  const me = await agent.get('/api/auth/me').expect(200)
  assert.equal(me.body._id, user._id)
})

test('signup with an existing email is rejected', async () => {
  const body = { name: 'Dup', email: 'dup@test.dev', password: 'secret-pass-1' }
  await request(ctx.app).post('/api/auth/signup').send(body).expect(201)
  const res = await request(ctx.app).post('/api/auth/signup').send(body).expect(409)
  assert.match(res.body.error, /already exists/)
})

test('signup validates input', async () => {
  const res = await request(ctx.app).post('/api/auth/signup').send({ name: 'A', email: 'not-an-email', password: '1' }).expect(400)
  assert.ok(res.body.error)
})

test('login works with the right password only', async () => {
  const body = { name: 'Login', email: 'login@test.dev', password: 'secret-pass-1' }
  await request(ctx.app).post('/api/auth/signup').send(body).expect(201)
  await request(ctx.app).post('/api/auth/login').send({ email: body.email, password: 'wrong-pass' }).expect(401)
  const res = await request(ctx.app).post('/api/auth/login').send({ email: 'LOGIN@test.dev', password: body.password }).expect(200)
  assert.ok(res.headers['set-cookie'][0].includes('HttpOnly'))
})

test('protected routes need a session, and logout ends it', async () => {
  await request(ctx.app).get('/api/lead').expect(401)
  const { agent } = await signedInAgent(ctx.app)
  await agent.get('/api/lead').expect(200)
  await agent.post('/api/auth/logout').expect(200)
  await agent.get('/api/lead').expect(401)
})

test('rotating the webhook token invalidates the old one', async () => {
  const { agent, user } = await signedInAgent(ctx.app)
  const res = await agent.post('/api/auth/hook-token').expect(200)
  assert.notEqual(res.body.hookToken, user.hookToken)
  await request(ctx.app).post(`/api/hook/${user.hookToken}`).send({ name: 'Old' }).expect(404)
  await request(ctx.app).post(`/api/hook/${res.body.hookToken}`).send({ name: 'New' }).expect(201)
})
