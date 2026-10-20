import { randomUUID } from 'node:crypto'
import { STATUSES, SOURCES, dayKey } from '../lib/constants.js'
import { notFound, badRequest } from '../lib/errors.js'

const DAY = 24 * 60 * 60 * 1000
const OPEN = ['contacted', 'qualified', 'proposal']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const clean = (v, max) => (v == null ? '' : String(v).trim().slice(0, max))

/** Picks the first non-empty value among several possible field names (forms name things differently). */
const pick = (body, keys, max) => clean(keys.map((k) => body[k]).find((v) => v != null && String(v).trim() !== ''), max)

/**
 * Maps a raw form / webhook payload to lead fields.
 * Accepts common naming styles: fullName, full_name, tel, business, utm_source...
 */
export function mapIntake(body = {}) {
  const first = pick(body, ['firstName', 'first_name'], 40)
  const last = pick(body, ['lastName', 'last_name'], 40)
  const lead = {
    name: pick(body, ['name', 'fullName', 'full_name'], 80) || [first, last].filter(Boolean).join(' '),
    email: pick(body, ['email', 'mail'], 120).toLowerCase(),
    phone: pick(body, ['phone', 'tel', 'mobile', 'phoneNumber'], 30),
    company: pick(body, ['company', 'business', 'organization'], 120),
    message: pick(body, ['message', 'notes', 'comment', 'text'], 2000),
    page: pick(body, ['page', 'pageUrl', 'url'], 300),
    utm: {
      source: pick(body, ['utm_source'], 60),
      medium: pick(body, ['utm_medium'], 60),
      campaign: pick(body, ['utm_campaign'], 80),
    },
  }
  const source = clean(body.source, 30).toLowerCase()
  lead.source = SOURCES.includes(source) ? source : 'webhook'
  return lead
}

export function createLeadService({ store, emit = () => {} }) {
  async function getOrThrow(ownerId, id) {
    const lead = await store.findLead(ownerId, id)
    if (!lead) throw notFound('Lead not found')
    return lead
  }

  async function update(ownerId, id, changes, activity, event = 'lead-updated') {
    const now = new Date()
    const lead = await store.updateLead(ownerId, id, {
      set: { ...changes.set, updatedAt: now },
      push: { ...changes.push, ...(activity && { activity: { ...activity, at: now } }) },
    })
    if (!lead) throw notFound('Lead not found')
    emit(ownerId, event, lead)
    return lead
  }

  return {
    async create(ownerId, data, { source = 'manual' } = {}) {
      const now = new Date()
      const lead = await store.createLead({
        ownerId,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        company: data.company || '',
        message: data.message || '',
        page: data.page || '',
        utm: data.utm || {},
        value: data.value ?? 0,
        source: data.source || source,
        status: 'new',
        tags: data.tags || [],
        notes: [],
        activity: [{ type: 'created', source: data.source || source, at: now }],
        createdAt: now,
        updatedAt: now,
        statusChangedAt: now,
        firstContactAt: null,
      })
      emit(ownerId, 'lead-added', lead)
      return lead
    },

    query: (ownerId, filters) => store.queryLeads(ownerId, filters),

    get: getOrThrow,

    async update(ownerId, id, fields) {
      if (!Object.keys(fields).length) return getOrThrow(ownerId, id)
      return update(ownerId, id, { set: fields }, { type: 'update', fields: Object.keys(fields) })
    },

    async setStatus(ownerId, id, status) {
      if (!STATUSES.includes(status)) throw badRequest('Unknown status')
      const lead = await getOrThrow(ownerId, id)
      if (lead.status === status) return lead
      const now = new Date()
      const set = { status, statusChangedAt: now }
      // the first move out of "new" is when someone actually got back to the lead
      if (!lead.firstContactAt && lead.status === 'new') set.firstContactAt = now
      return update(ownerId, id, { set }, { type: 'status', from: lead.status, to: status })
    },

    async addNote(ownerId, id, text, by) {
      const note = { _id: randomUUID(), text, by, at: new Date() }
      return update(ownerId, id, { push: { notes: note } }, { type: 'note' })
    },

    async remove(ownerId, id) {
      const ok = await store.deleteLead(ownerId, id)
      if (!ok) throw notFound('Lead not found')
      emit(ownerId, 'lead-removed', { _id: id })
    },

    /**
     * Public intake (website forms, Make, Zapier). Re-submissions within 24 hours
     * are added to the existing lead as a note instead of creating a duplicate.
     */
    async intake(user, body) {
      const data = mapIntake(body)
      if (data.email && !EMAIL_RE.test(data.email)) throw badRequest('Invalid email')
      if (!data.name && !data.email && !data.phone) throw badRequest('Send at least a name, an email or a phone')
      const dup = await store.findRecentDuplicate(user._id, data, new Date(Date.now() - DAY))
      if (dup) {
        const text = data.message ? `Submitted the form again: ${data.message}` : 'Submitted the form again'
        const lead = await update(user._id, dup._id, { push: { notes: { _id: randomUUID(), text, by: 'webhook', at: new Date() } } }, { type: 'duplicate' })
        return { lead, duplicate: true }
      }
      return { lead: await this.create(user._id, data), duplicate: false }
    },

    async stats(ownerId, days = 14) {
      const today = new Date(dayKey(new Date()))
      const since = new Date(today.getTime() - (days - 1) * DAY)
      const raw = await store.stats(ownerId, since)
      const perDay = Array.from({ length: days }, (_, i) => {
        const date = dayKey(since.getTime() + i * DAY)
        return { date, count: raw.perDay[date] || 0 }
      })
      const count = (s) => raw.byStatus[s]?.count || 0
      const closed = count('won') + count('lost')
      return {
        total: raw.total,
        byStatus: Object.fromEntries(STATUSES.map((s) => [s, raw.byStatus[s] || { count: 0, value: 0 }])),
        bySource: raw.bySource,
        perDay,
        winRate: closed ? count('won') / closed : null,
        openPipelineValue: OPEN.reduce((sum, s) => sum + (raw.byStatus[s]?.value || 0), 0),
        wonValue: raw.byStatus.won?.value || 0,
        avgFirstResponseHours: raw.avgFirstResponseMs == null ? null : raw.avgFirstResponseMs / 3600000,
      }
    },
  }
}
