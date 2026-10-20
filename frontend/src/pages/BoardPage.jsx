import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { Board } from '../cmps/Board'
import { AddLeadModal } from '../cmps/AddLeadModal'
import { Icon } from '../cmps/Icon'
import { SOURCES, SOURCE_LABEL } from '../utils/format'

export function matchesFilter(lead, q, source) {
  if (source && lead.source !== source) return false
  if (!q) return true
  const needle = q.toLowerCase()
  return [lead.name, lead.email, lead.company, lead.phone].some((v) => v?.toLowerCase().includes(needle))
}

export function BoardPage() {
  const { items, loaded } = useSelector((s) => s.leads)
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [source, setSource] = useState('')
  const [adding, setAdding] = useState(false)
  const open = (id) => setParams({ ...Object.fromEntries(params), lead: id })
  const leads = useMemo(() => items.filter((l) => matchesFilter(l, q, source)), [items, q, source])

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Pipeline</h1>
          <p>Drag a card to move it to the next stage. New leads appear here the moment a form is sent.</p>
        </div>
        <label className="search">
          <span className="sr-only">Search leads</span>
          <Icon name="search" />
          <input className="input" placeholder="Search name, email, company" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="select" style={{ width: 150 }} value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter by source">
          <option value="">All sources</option>
          {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Icon name="plus" />Add lead</button>
      </div>
      {!loaded ? <div className="empty">Loading your pipeline…</div> : <Board leads={leads} onOpen={open} />}
      {adding && <AddLeadModal onClose={() => setAdding(false)} onCreated={(lead) => open(lead._id)} />}
    </>
  )
}
