import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { setup, signedInAgent } from './helpers.js'
import { buildDemoLeads } from '../lib/demoData.js'

let ctx
before(async () => { ctx = await setup() })
after(async () => { await ctx.teardown() })

test('stats summarize the pipeline', async () => {
  const { agent } = await signedInAgent(ctx.app)
  const ids = []
  for (const [name, value] of [['A', 100], ['B', 200], ['C', 300], ['D', 0]]) {
    const { body } = await agent.post('/api/lead').send({ name, value }).expect(201)
    ids.push(body._id)
  }
  await agent.patch(`/api/lead/${ids[0]}/status`).send({ status: 'won' }).expect(200)
  await agent.patch(`/api/lead/${ids[1]}/status`).send({ status: 'lost' }).expect(200)
  await agent.patch(`/api/lead/${ids[2]}/status`).send({ status: 'proposal' }).expect(200)

  const { body } = await agent.get('/api/stats').expect(200)
  assert.equal(body.total, 4)
  assert.equal(body.byStatus.new.count, 1)
  assert.equal(body.byStatus.won.count, 1)
  assert.equal(body.winRate, 0.5)
  assert.equal(body.openPipelineValue, 300)
  assert.equal(body.wonValue, 100)
  assert.equal(body.bySource.manual, 4)
  assert.equal(body.perDay.length, 14)
  assert.equal(body.perDay.at(-1).count, 4)
  assert.ok(body.avgFirstResponseHours >= 0)
})

test('stats work on a realistic data set', async () => {
  const { agent, user } = await signedInAgent(ctx.app)
  await ctx.store.insertLeads(buildDemoLeads(user._id))
  const { body } = await agent.get('/api/stats?days=30').expect(200)
  assert.equal(body.total, 26)
  assert.equal(body.perDay.length, 30)
  const sum = Object.values(body.byStatus).reduce((s, x) => s + x.count, 0)
  assert.equal(sum, 26)
  assert.ok(body.avgFirstResponseHours > 0)
  await agent.get('/api/stats?days=500').expect(400)
})
