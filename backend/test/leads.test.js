import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { setup, signedInAgent } from './helpers.js'

let ctx
before(async () => { ctx = await setup() })
after(async () => { await ctx.teardown() })

test('create, read, update and delete a lead', async () => {
  const { agent } = await signedInAgent(ctx.app)
  const created = await agent.post('/api/lead').send({ name: 'Dana Klein', email: 'Dana@Example.com', company: 'Klein Clinic', value: 1500 }).expect(201)
  assert.equal(created.body.status, 'new')
  assert.equal(created.body.email, 'dana@example.com')
  assert.equal(created.body.source, 'manual')
  assert.equal(created.body.activity[0].type, 'created')

  const id = created.body._id
  const got = await agent.get(`/api/lead/${id}`).expect(200)
  assert.equal(got.body.name, 'Dana Klein')

  const updated = await agent.put(`/api/lead/${id}`).send({ phone: '050-1234567', value: 2000 }).expect(200)
  assert.equal(updated.body.phone, '050-1234567')
  assert.equal(updated.body.value, 2000)
  assert.deepEqual(updated.body.activity.at(-1).fields.sort(), ['phone', 'value'])

  await agent.delete(`/api/lead/${id}`).expect(200)
  await agent.get(`/api/lead/${id}`).expect(404)
})

test('moving out of "new" records the first response time and the activity', async () => {
  const { agent } = await signedInAgent(ctx.app)
  const { body: lead } = await agent.post('/api/lead').send({ name: 'Omer' }).expect(201)
  const moved = await agent.patch(`/api/lead/${lead._id}/status`).send({ status: 'contacted' }).expect(200)
  assert.equal(moved.body.status, 'contacted')
  assert.ok(moved.body.firstContactAt)
  assert.deepEqual(
    { type: moved.body.activity.at(-1).type, from: moved.body.activity.at(-1).from, to: moved.body.activity.at(-1).to },
    { type: 'status', from: 'new', to: 'contacted' }
  )
  const again = await agent.patch(`/api/lead/${lead._id}/status`).send({ status: 'qualified' }).expect(200)
  assert.equal(again.body.firstContactAt, moved.body.firstContactAt)
  await agent.patch(`/api/lead/${lead._id}/status`).send({ status: 'archived' }).expect(400)
})

test('notes are appended with the author name', async () => {
  const { agent } = await signedInAgent(ctx.app, 'Shira')
  const { body: lead } = await agent.post('/api/lead').send({ name: 'Itai' }).expect(201)
  const res = await agent.post(`/api/lead/${lead._id}/note`).send({ text: 'Called, sending a quote' }).expect(201)
  assert.equal(res.body.notes.length, 1)
  assert.equal(res.body.notes[0].by, 'Shira')
  await agent.post(`/api/lead/${lead._id}/note`).send({ text: '   ' }).expect(400)
})

test('filters, search and sorting', async () => {
  const { agent } = await signedInAgent(ctx.app)
  await agent.post('/api/lead').send({ name: 'Alpha', company: 'Physio Center', value: 10 }).expect(201)
  const { body: b } = await agent.post('/api/lead').send({ name: 'Bravo', value: 30 }).expect(201)
  await agent.post('/api/lead').send({ name: 'Charlie', value: 20 }).expect(201)
  await agent.patch(`/api/lead/${b._id}/status`).send({ status: 'won' }).expect(200)

  const won = await agent.get('/api/lead?status=won').expect(200)
  assert.deepEqual(won.body.leads.map((l) => l.name), ['Bravo'])

  const search = await agent.get('/api/lead?q=physio').expect(200)
  assert.deepEqual(search.body.leads.map((l) => l.name), ['Alpha'])

  const byValue = await agent.get('/api/lead?sort=-value').expect(200)
  assert.deepEqual(byValue.body.leads.map((l) => l.name), ['Bravo', 'Charlie', 'Alpha'])
  assert.equal(byValue.body.total, 3)
})

test('users only see their own leads', async () => {
  const a = await signedInAgent(ctx.app)
  const b = await signedInAgent(ctx.app)
  const { body: lead } = await a.agent.post('/api/lead').send({ name: 'Private' }).expect(201)
  await b.agent.get(`/api/lead/${lead._id}`).expect(404)
  await b.agent.put(`/api/lead/${lead._id}`).send({ name: 'Hacked' }).expect(404)
  await b.agent.delete(`/api/lead/${lead._id}`).expect(404)
  const list = await b.agent.get('/api/lead').expect(200)
  assert.equal(list.body.total, 0)
})

test('input validation', async () => {
  const { agent } = await signedInAgent(ctx.app)
  await agent.post('/api/lead').send({ email: 'x@y.com' }).expect(400)
  await agent.post('/api/lead').send({ name: 'X', email: 'nope' }).expect(400)
  const { body: lead } = await agent.post('/api/lead').send({ name: 'Y' }).expect(201)
  await agent.put(`/api/lead/${lead._id}`).send({ status: 'won' }).expect(400)
  await agent.get('/api/lead/does-not-exist').expect(404)
})
