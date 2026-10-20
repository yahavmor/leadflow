import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { setup, signedInAgent } from './helpers.js'
import { mapIntake } from '../services/lead.service.js'

let ctx, owner
before(async () => {
  ctx = await setup()
  owner = await signedInAgent(ctx.app, 'Owner')
})
after(async () => { await ctx.teardown() })

const hook = () => `/api/hook/${owner.user.hookToken}`

test('unknown tokens are rejected', async () => {
  await request(ctx.app).post('/api/hook/not-a-real-token').send({ name: 'X' }).expect(404)
})

test('a JSON submission creates a lead and pushes a real-time event', async () => {
  const before = ctx.events.length
  const res = await request(ctx.app).post(hook()).send({ name: 'Noa Levi', email: 'noa@example.com', phone: '0501111111', source: 'make', message: 'Hi' }).expect(201)
  assert.equal(res.body.ok, true)
  assert.equal(res.body.duplicate, false)
  const event = ctx.events.slice(before).find((e) => e.event === 'lead-added')
  assert.equal(event.userId, owner.user._id)
  assert.equal(event.data.source, 'make')
  const { body } = await owner.agent.get(`/api/lead/${res.body.id}`).expect(200)
  assert.equal(body.name, 'Noa Levi')
})

test('a classic form post (urlencoded) with different field names is mapped', async () => {
  const res = await request(ctx.app)
    .post(hook())
    .type('form')
    .send({ fullName: 'Daniel Cohen', mail: 'Daniel@Example.com', tel: '0522222222', business: 'Cohen Accounting', utm_source: 'google' })
    .expect(201)
  const { body } = await owner.agent.get(`/api/lead/${res.body.id}`).expect(200)
  assert.equal(body.email, 'daniel@example.com')
  assert.equal(body.company, 'Cohen Accounting')
  assert.equal(body.utm.source, 'google')
  assert.equal(body.source, 'webhook')
})

test('the same person within 24 hours becomes a note, not a duplicate', async () => {
  const first = await request(ctx.app).post(hook()).send({ name: 'Maya', email: 'maya@example.com' }).expect(201)
  const second = await request(ctx.app).post(hook()).send({ name: 'Maya F', email: 'maya@example.com', message: 'Still interested' }).expect(200)
  assert.equal(second.body.duplicate, true)
  assert.equal(second.body.id, first.body.id)
  const { body } = await owner.agent.get(`/api/lead/${first.body.id}`).expect(200)
  assert.match(body.notes.at(-1).text, /Still interested/)
})

test('honeypot submissions are accepted silently and dropped', async () => {
  const { body: beforeList } = await owner.agent.get('/api/lead').expect(200)
  await request(ctx.app).post(hook()).send({ name: 'Bot', website: 'http://spam.example' }).expect(200)
  const { body: afterList } = await owner.agent.get('/api/lead').expect(200)
  assert.equal(afterList.total, beforeList.total)
})

test('validation: needs a way to reach the person, and a valid email', async () => {
  await request(ctx.app).post(hook()).send({ message: 'no contact details' }).expect(400)
  await request(ctx.app).post(hook()).send({ name: 'X', email: 'broken@' }).expect(400)
})

test('plain HTML forms can redirect to a thank-you page', async () => {
  const res = await request(ctx.app)
    .post(hook())
    .set('Accept', 'text/html')
    .type('form')
    .send({ name: 'Redirect Me', _redirect: 'https://example.com/thanks' })
    .expect(303)
  assert.equal(res.headers.location, 'https://example.com/thanks')
})

test('mapIntake joins first and last names and trims long values', () => {
  const lead = mapIntake({ first_name: 'Yael', last_name: 'Mizrahi', message: 'x'.repeat(5000), source: 'TikTok' })
  assert.equal(lead.name, 'Yael Mizrahi')
  assert.equal(lead.message.length, 2000)
  assert.equal(lead.source, 'webhook')
})
