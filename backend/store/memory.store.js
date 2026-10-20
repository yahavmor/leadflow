import { randomUUID } from 'node:crypto'
import { escapeRegex, parseSort, dayKey } from '../lib/constants.js'

/**
 * In-memory store with the same interface as the MongoDB store.
 * Used by the test suite and for running the app locally without a database.
 */
export function createMemoryStore() {
  const users = new Map()
  const leads = new Map()
  const clone = (x) => (x ? structuredClone(x) : null)
  const ownLeads = (ownerId) => [...leads.values()].filter((l) => l.ownerId === ownerId)

  return {
    kind: 'memory',
    async connect() {},
    async close() {},
    async drop() {
      users.clear()
      leads.clear()
    },

    async createUser(user) {
      const doc = { ...user, _id: randomUUID(), createdAt: new Date() }
      users.set(doc._id, doc)
      return clone(doc)
    },
    async findUserByEmail(email) {
      for (const u of users.values()) if (u.email === email) return clone(u)
      return null
    },
    async findUserById(id) {
      return clone(users.get(String(id)))
    },
    async findUserByHookToken(token) {
      for (const u of users.values()) if (u.hookToken === token) return clone(u)
      return null
    },
    async updateUser(id, set) {
      const u = users.get(String(id))
      if (!u) return null
      Object.assign(u, set)
      return clone(u)
    },

    async createLead(lead) {
      const doc = { ...lead, _id: randomUUID() }
      leads.set(doc._id, doc)
      return clone(doc)
    },
    async insertLeads(list) {
      return Promise.all(list.map((l) => this.createLead(l)))
    },
    async findLead(ownerId, id) {
      const l = leads.get(String(id))
      return l && l.ownerId === ownerId ? clone(l) : null
    },
    async queryLeads(ownerId, { status, source, q, sort, page = 1, limit = 50 } = {}) {
      let list = ownLeads(ownerId)
      if (status) list = list.filter((l) => l.status === status)
      if (source) list = list.filter((l) => l.source === source)
      if (q) {
        const re = new RegExp(escapeRegex(q), 'i')
        list = list.filter((l) => [l.name, l.email, l.phone, l.company].some((v) => v && re.test(v)))
      }
      const { field, dir } = parseSort(sort)
      list.sort((a, b) => {
        const av = a[field] ?? ''
        const bv = b[field] ?? ''
        if (av < bv) return -dir
        if (av > bv) return dir
        return 0
      })
      const total = list.length
      const start = (page - 1) * limit
      return { leads: list.slice(start, start + limit).map(clone), total }
    },
    async updateLead(ownerId, id, { set = {}, push = {} } = {}) {
      const l = leads.get(String(id))
      if (!l || l.ownerId !== ownerId) return null
      Object.assign(l, structuredClone(set))
      for (const [key, val] of Object.entries(push)) l[key] = [...(l[key] || []), structuredClone(val)]
      return clone(l)
    },
    async deleteLead(ownerId, id) {
      const l = leads.get(String(id))
      if (!l || l.ownerId !== ownerId) return false
      return leads.delete(l._id)
    },
    async deleteLeadsByOwner(ownerId) {
      for (const l of ownLeads(ownerId)) leads.delete(l._id)
    },
    async findRecentDuplicate(ownerId, { email, phone }, since) {
      return clone(
        ownLeads(ownerId).find(
          (l) => l.createdAt >= since && ((email && l.email === email) || (phone && l.phone === phone))
        ) || null
      )
    },
    async stats(ownerId, since) {
      const list = ownLeads(ownerId)
      const byStatus = {}
      const bySource = {}
      const perDay = {}
      let responseSum = 0
      let responseCount = 0
      for (const l of list) {
        byStatus[l.status] ??= { count: 0, value: 0 }
        byStatus[l.status].count++
        byStatus[l.status].value += l.value || 0
        bySource[l.source] = (bySource[l.source] || 0) + 1
        if (l.createdAt >= since) perDay[dayKey(l.createdAt)] = (perDay[dayKey(l.createdAt)] || 0) + 1
        if (l.firstContactAt) {
          responseSum += new Date(l.firstContactAt) - new Date(l.createdAt)
          responseCount++
        }
      }
      return {
        total: list.length,
        byStatus,
        bySource,
        perDay,
        avgFirstResponseMs: responseCount ? responseSum / responseCount : null,
      }
    },
  }
}
