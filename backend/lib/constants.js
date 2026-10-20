export const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
export const SOURCES = ['website', 'webhook', 'make', 'facebook', 'instagram', 'referral', 'manual']
export const SORTABLE = ['createdAt', 'updatedAt', 'statusChangedAt', 'name', 'value']

export function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Parses "-createdAt" into { field: 'createdAt', dir: -1 }, falling back to newest first. */
export function parseSort(sort) {
  const dir = String(sort || '').startsWith('-') ? -1 : 1
  const field = String(sort || '').replace(/^-/, '')
  return SORTABLE.includes(field) ? { field, dir } : { field: 'createdAt', dir: -1 }
}

export const dayKey = (date) => new Date(date).toISOString().slice(0, 10)
