import { Router } from 'express'
import { z } from 'zod'
import { wrap } from '../middlewares/errorHandler.js'
import { requireAuth } from '../middlewares/requireAuth.js'

const querySchema = z.object({ days: z.coerce.number().int().min(7).max(90).default(14) })

export function statsRoutes({ leadService }) {
  const router = Router()
  router.get('/', requireAuth, wrap(async (req, res) => {
    const { days } = querySchema.parse(req.query)
    res.json(await leadService.stats(req.userId, days))
  }))
  return router
}
