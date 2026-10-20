import { forwardRef, memo } from 'react'
import { SOURCE_LABEL, STATUS, initials, money, timeAgo } from '../utils/format'

const AVATAR_COLORS = ['#0e9f8f', '#2563eb', '#7c3aed', '#d97706', '#db2777', '#0891b2', '#4d7c0f']
const colorFor = (name = '') => AVATAR_COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length]

export const LeadCard = memo(forwardRef(function LeadCard({ lead, fresh = false, dragging = false, overlay = false, ...rest }, ref) {
  const classes = ['card', fresh && 'fresh', dragging && 'dragging', overlay && 'overlay'].filter(Boolean).join(' ')
  return (
    <div ref={ref} className={classes} data-status={lead.status} {...rest}>
      <div className="card-top">
        <span className="avatar" style={{ background: colorFor(lead.name) }}>{initials(lead.name)}</span>
        <div>
          <div className="card-name">{lead.name || lead.email || 'Unnamed lead'}</div>
          {lead.company && <div className="card-company">{lead.company}</div>}
        </div>
      </div>
      <div className="card-meta">
        <span className="chip">{SOURCE_LABEL[lead.source] || lead.source}</span>
        {lead.tags?.includes('hot') && <span className="chip hot">Hot</span>}
        <span title={new Date(lead.createdAt).toLocaleString()}>{timeAgo(lead.createdAt)}</span>
        {lead.value > 0 && <span className="value">{money(lead.value)}</span>}
      </div>
    </div>
  )
}))

export function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, color: '#64748b' }
  return (
    <span className="status-badge" style={{ color: s.color, background: `${s.color}14` }}>{s.label}</span>
  )
}
