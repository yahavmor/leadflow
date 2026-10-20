import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { StatusBadge } from '../cmps/LeadCard'
import { Icon } from '../cmps/Icon'
import { matchesFilter } from './BoardPage'
import { SOURCE_LABEL, STATUSES, money, timeAgo } from '../utils/format'

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'company', label: 'Company' },
  { key: 'status', label: 'Stage' },
  { key: 'source', label: 'Source' },
  { key: 'value', label: 'Value' },
  { key: 'createdAt', label: 'Added' },
]
const STAGE_ORDER = Object.fromEntries(STATUSES.map((s, i) => [s.id, i]))

export function LeadsPage() {
  const items = useSelector((s) => s.leads.items)
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState({ key: 'createdAt', dir: -1 })

  const rows = useMemo(() => {
    const val = (l) => (sort.key === 'status' ? STAGE_ORDER[l.status] : sort.key === 'createdAt' ? new Date(l.createdAt).getTime() : l[sort.key] ?? '')
    return items.filter((l) => matchesFilter(l, q)).sort((a, b) => (val(a) > val(b) ? sort.dir : val(a) < val(b) ? -sort.dir : 0))
  }, [items, q, sort])

  const toggle = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : key === 'name' || key === 'company' ? 1 : -1 }))

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>All leads</h1>
          <p>{rows.length} of {items.length} leads</p>
        </div>
        <label className="search">
          <span className="sr-only">Search leads</span>
          <Icon name="search" />
          <input className="input" placeholder="Search name, email, company" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <div className="panel table-wrap">
        <table className="leads">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} aria-sort={sort.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                  <button onClick={() => toggle(c.key)}>{c.label}{sort.key === c.key ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l._id} onClick={() => setParams({ ...Object.fromEntries(params), lead: l._id })}>
                <td><b>{l.name}</b><div className="muted" style={{ fontSize: 12.5 }}>{l.email}</div></td>
                <td>{l.company || '-'}</td>
                <td><StatusBadge status={l.status} /></td>
                <td>{SOURCE_LABEL[l.source] || l.source}</td>
                <td className="mono">{money(l.value)}</td>
                <td title={new Date(l.createdAt).toLocaleString()}>{timeAgo(l.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="empty">No leads match your search.</div>}
      </div>
    </>
  )
}
