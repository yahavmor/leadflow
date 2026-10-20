import { describe, expect, test } from 'vitest'
import reducer, { leadRemoved, leadUpserted, moveLead } from './leadsSlice'

const lead = (id, status = 'new') => ({ _id: id, name: `Lead ${id}`, status, statusChangedAt: '2026-01-01T00:00:00.000Z' })
const state = (...items) => ({ items, loaded: true, loading: false, error: null, prevStatus: {} })

describe('leadsSlice', () => {
  test('moving a lead is optimistic', () => {
    const next = reducer(state(lead('a')), { type: moveLead.pending.type, meta: { arg: { id: 'a', status: 'contacted' } } })
    expect(next.items[0].status).toBe('contacted')
    expect(next.prevStatus.a).toBe('new')
  })

  test('a failed move puts the card back', () => {
    let s = reducer(state(lead('a')), { type: moveLead.pending.type, meta: { arg: { id: 'a', status: 'won' } } })
    s = reducer(s, { type: moveLead.rejected.type, meta: { arg: { id: 'a', status: 'won' } }, error: { message: 'nope' } })
    expect(s.items[0].status).toBe('new')
    expect(s.prevStatus).toEqual({})
  })

  test('a confirmed move takes the server version', () => {
    let s = reducer(state(lead('a')), { type: moveLead.pending.type, meta: { arg: { id: 'a', status: 'won' } } })
    s = reducer(s, { type: moveLead.fulfilled.type, payload: { ...lead('a', 'won'), firstContactAt: 'x' }, meta: { arg: { id: 'a', status: 'won' } } })
    expect(s.items[0]).toMatchObject({ status: 'won', firstContactAt: 'x' })
  })

  test('live events add new leads on top and update existing ones', () => {
    let s = reducer(state(lead('a')), leadUpserted(lead('b')))
    expect(s.items.map((l) => l._id)).toEqual(['b', 'a'])
    s = reducer(s, leadUpserted({ ...lead('a'), name: 'Renamed' }))
    expect(s.items.find((l) => l._id === 'a').name).toBe('Renamed')
    s = reducer(s, leadRemoved({ _id: 'b' }))
    expect(s.items.map((l) => l._id)).toEqual(['a'])
  })
})
