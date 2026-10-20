import { MongoClient, ObjectId } from 'mongodb'
import { escapeRegex, parseSort } from '../lib/constants.js'
import { logger } from '../services/logger.service.js'

const oid = (id) => (ObjectId.isValid(String(id)) ? new ObjectId(String(id)) : null)

/** Converts ObjectIds to strings so the API returns the same shape as the memory store. */
function out(doc) {
  if (!doc) return null
  const res = { ...doc, _id: doc._id.toString() }
  if (doc.ownerId) res.ownerId = doc.ownerId.toString()
  if (doc.notes) res.notes = doc.notes.map((n) => ({ ...n, _id: String(n._id) }))
  return res
}

/** Converts string ids inside a lead to ObjectIds before writing. */
function toDb(lead) {
  const doc = { ...lead }
  if (doc.ownerId) doc.ownerId = oid(doc.ownerId)
  return doc
}

export function createMongoStore({ url, dbName }) {
  let client
  let users
  let leads

  return {
    kind: 'mongo',

    async connect() {
      client = new MongoClient(url)
      await client.connect()
      const db = client.db(dbName)
      users = db.collection('users')
      leads = db.collection('leads')
      await Promise.all([
        users.createIndex({ email: 1 }, { unique: true }),
        users.createIndex({ hookToken: 1 }, { unique: true }),
        leads.createIndex({ ownerId: 1, status: 1, statusChangedAt: -1 }),
        leads.createIndex({ ownerId: 1, createdAt: -1 }),
        leads.createIndex({ ownerId: 1, email: 1 }),
      ])
      logger.info(`MongoDB connected (${dbName})`)
    },
    async close() {
      await client?.close()
    },
    /** Test helper: removes the whole database. */
    async drop() {
      await client.db(dbName).dropDatabase()
    },

    async createUser(user) {
      const doc = { ...user, createdAt: new Date() }
      const { insertedId } = await users.insertOne(doc)
      return out({ ...doc, _id: insertedId })
    },
    async findUserByEmail(email) {
      return out(await users.findOne({ email }))
    },
    async findUserById(id) {
      const _id = oid(id)
      return _id ? out(await users.findOne({ _id })) : null
    },
    async findUserByHookToken(token) {
      return out(await users.findOne({ hookToken: token }))
    },
    async updateUser(id, set) {
      const _id = oid(id)
      if (!_id) return null
      return out(await users.findOneAndUpdate({ _id }, { $set: set }, { returnDocument: 'after', includeResultMetadata: false }))
    },

    async createLead(lead) {
      const doc = toDb(lead)
      const { insertedId } = await leads.insertOne(doc)
      return out({ ...doc, _id: insertedId })
    },
    async insertLeads(list) {
      if (!list.length) return []
      const docs = list.map(toDb)
      const { insertedIds } = await leads.insertMany(docs)
      return docs.map((d, i) => out({ ...d, _id: insertedIds[i] }))
    },
    async findLead(ownerId, id) {
      const _id = oid(id)
      return _id ? out(await leads.findOne({ _id, ownerId: oid(ownerId) })) : null
    },
    async queryLeads(ownerId, { status, source, q, sort, page = 1, limit = 50 } = {}) {
      const filter = { ownerId: oid(ownerId) }
      if (status) filter.status = status
      if (source) filter.source = source
      if (q) {
        const re = new RegExp(escapeRegex(q), 'i')
        filter.$or = [{ name: re }, { email: re }, { phone: re }, { company: re }]
      }
      const { field, dir } = parseSort(sort)
      const [docs, total] = await Promise.all([
        leads.find(filter).sort({ [field]: dir, _id: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
        leads.countDocuments(filter),
      ])
      return { leads: docs.map(out), total }
    },
    async updateLead(ownerId, id, { set = {}, push = {} } = {}) {
      const _id = oid(id)
      if (!_id) return null
      const update = {}
      if (Object.keys(set).length) update.$set = set
      if (Object.keys(push).length) update.$push = push
      const doc = await leads.findOneAndUpdate({ _id, ownerId: oid(ownerId) }, update, { returnDocument: 'after', includeResultMetadata: false })
      return out(doc)
    },
    async deleteLead(ownerId, id) {
      const _id = oid(id)
      if (!_id) return false
      const { deletedCount } = await leads.deleteOne({ _id, ownerId: oid(ownerId) })
      return deletedCount === 1
    },
    async deleteLeadsByOwner(ownerId) {
      await leads.deleteMany({ ownerId: oid(ownerId) })
    },
    async findRecentDuplicate(ownerId, { email, phone }, since) {
      const or = []
      if (email) or.push({ email })
      if (phone) or.push({ phone })
      if (!or.length) return null
      return out(await leads.findOne({ ownerId: oid(ownerId), createdAt: { $gte: since }, $or: or }))
    },
    async stats(ownerId, since) {
      const [res] = await leads
        .aggregate([
          { $match: { ownerId: oid(ownerId) } },
          {
            $facet: {
              total: [{ $count: 'n' }],
              byStatus: [{ $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: { $ifNull: ['$value', 0] } } } }],
              bySource: [{ $group: { _id: '$source', count: { $sum: 1 } } }],
              perDay: [
                { $match: { createdAt: { $gte: since } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
              ],
              response: [
                { $match: { firstContactAt: { $type: 'date' } } },
                { $group: { _id: null, avg: { $avg: { $subtract: ['$firstContactAt', '$createdAt'] } } } },
              ],
            },
          },
        ])
        .toArray()
      const toMap = (arr, pick) => Object.fromEntries(arr.map((x) => [x._id, pick(x)]))
      return {
        total: res.total[0]?.n || 0,
        byStatus: toMap(res.byStatus, (x) => ({ count: x.count, value: x.value })),
        bySource: toMap(res.bySource, (x) => x.count),
        perDay: toMap(res.perDay, (x) => x.count),
        avgFirstResponseMs: res.response[0]?.avg ?? null,
      }
    },
  }
}
