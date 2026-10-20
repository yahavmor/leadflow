import { Router } from 'express'
import { z } from 'zod'
import { STATUSES, SOURCES } from '../lib/constants.js'
import { wrap } from '../middlewares/errorHandler.js'
import { requireAuth } from '../middlewares/requireAuth.js'

const optionalText = (max) => z.string().trim().max(max).optional()

const leadFields = {
  name: z.string().trim().min(1).max(80),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email().max(120)]).optional(),
  phone: optionalText(30),
  company: optionalText(120),
  message: optionalText(2000),
  value: z.coerce.number().min(0).max(1e9).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
}
const createSchema = z.object({ ...leadFields, source: z.enum(SOURCES).optional() })
const updateSchema = z.object(leadFields).partial().strict()
const statusSchema = z.object({ status: z.enum(STATUSES) })
const noteSchema = z.object({ text: z.string().trim().min(1).max(2000) })
const querySchema = z.object({
  status: z.enum(STATUSES).optional(),
  source: z.enum(SOURCES).optional(),
  q: z.string().trim().max(80).optional(),
  sort: z.string().max(30).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

export function leadRoutes({ leadService, store }) {
  const router = Router()
  router.use(requireAuth)

  router.get('/', wrap(async (req, res) => {
    res.json(await leadService.query(req.userId, querySchema.parse(req.query)))
  }))

  router.post('/', wrap(async (req, res) => {
    res.status(201).json(await leadService.create(req.userId, createSchema.parse(req.body)))
  }))

  router.get('/:id', wrap(async (req, res) => {
    res.json(await leadService.get(req.userId, req.params.id))
  }))

  router.put('/:id', wrap(async (req, res) => {
    res.json(await leadService.update(req.userId, req.params.id, updateSchema.parse(req.body)))
  }))

  router.patch('/:id/status', wrap(async (req, res) => {
    const { status } = statusSchema.parse(req.body)
    res.json(await leadService.setStatus(req.userId, req.params.id, status))
  }))

  router.post('/:id/note', wrap(async (req, res) => {
    const { text } = noteSchema.parse(req.body)
    const user = await store.findUserById(req.userId)
    res.status(201).json(await leadService.addNote(req.userId, req.params.id, text, user?.name || 'You'))
  }))

  router.delete('/:id', wrap(async (req, res) => {
    await leadService.remove(req.userId, req.params.id)
    res.json({ ok: true })
  }))

  return router
}
