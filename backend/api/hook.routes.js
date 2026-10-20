import express, { Router } from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { wrap } from '../middlewares/errorHandler.js'

/**
 * Public intake endpoint: POST /api/hook/:token
 * Works with fetch() from any website, a plain HTML form, Make's HTTP module or Zapier.
 */
export function hookRoutes({ leadService, store }) {
  const router = Router()
  router.use(cors({ origin: true, methods: ['POST'] }))
  router.use(express.urlencoded({ extended: false, limit: '50kb' }))
  router.use(rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false }))

  router.post('/:token', wrap(async (req, res) => {
    const user = await store.findUserByHookToken(req.params.token)
    if (!user) return res.status(404).json({ error: 'Unknown webhook' })

    const body = req.body || {}
    // honeypot field: real people never fill it, bots usually do
    if (String(body.website || body._gotcha || '').trim()) return res.json({ ok: true })

    const { lead, duplicate } = await leadService.intake(user, body)

    // a classic <form action="..."> can send people to a thank-you page
    const redirect = String(body._redirect || '')
    if (/^https?:\/\//.test(redirect) && req.accepts(['json', 'html']) === 'html') return res.redirect(303, redirect)

    res.status(duplicate ? 200 : 201).json({ ok: true, id: lead._id, duplicate })
  }))

  return router
}
