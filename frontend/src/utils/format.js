export const STATUSES = [
  { id: 'new', label: 'New', color: '#2563EB' },
  { id: 'contacted', label: 'Contacted', color: '#7C3AED' },
  { id: 'qualified', label: 'Qualified', color: '#0891B2' },
  { id: 'proposal', label: 'Proposal', color: '#D97706' },
  { id: 'won', label: 'Won', color: '#16A34A' },
  { id: 'lost', label: 'Lost', color: '#94A3B8' },
]
export const STATUS = Object.fromEntries(STATUSES.map((s) => [s.id, s]))

export const SOURCES = ['website', 'webhook', 'make', 'facebook', 'instagram', 'referral', 'manual']
export const SOURCE_LABEL = {
  website: 'Website', webhook: 'Webhook', make: 'Make', facebook: 'Facebook', instagram: 'Instagram', referral: 'Referral', manual: 'Manual',
}

const UNITS = [['y', 31536000], ['mo', 2592000], ['d', 86400], ['h', 3600], ['m', 60]]

/** "just now", "5m ago", "3h ago", "2d ago" */
export function timeAgo(date, now = Date.now()) {
  const sec = Math.max(0, Math.round((now - new Date(date).getTime()) / 1000))
  if (sec < 45) return 'just now'
  for (const [unit, size] of UNITS) {
    if (sec >= size) return `${Math.floor(sec / size)}${unit} ago`
  }
  return 'just now'
}

export const money = (n) => (n ? `₪${Math.round(n).toLocaleString('en-US')}` : '-')

export function hours(h) {
  if (h == null) return '-'
  if (h < 1) return `${Math.round(h * 60)} min`
  if (h < 48) return `${h.toFixed(1)} h`
  return `${(h / 24).toFixed(1)} days`
}

export const percent = (x) => (x == null ? '-' : `${Math.round(x * 100)}%`)

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'

export const fullDate = (d) =>
  new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
