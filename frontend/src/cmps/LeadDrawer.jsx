import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { addNote, deleteLead, moveLead, updateLead } from '../store/leadsSlice'
import { toastAdded } from '../store/uiSlice'
import { StatusBadge } from './LeadCard'
import { Icon } from './Icon'
import { STATUSES, STATUS, SOURCE_LABEL, fullDate, money, timeAgo } from '../utils/format'

const EDITABLE = ['name', 'email', 'phone', 'company', 'value']

function activityText(a) {
  switch (a.type) {
    case 'created': return `Lead created (${SOURCE_LABEL[a.source] || a.source})`
    case 'status': return `Moved from ${STATUS[a.from]?.label} to ${STATUS[a.to]?.label}`
    case 'note': return 'Note added'
    case 'update': return `Updated ${a.fields?.join(', ')}`
    case 'duplicate': return 'Sent the form again'
    default: return a.type
  }
}

export function LeadDrawer({ leadId, onClose }) {
  const dispatch = useDispatch()
  const lead = useSelector((s) => s.leads.items.find((l) => l._id === leadId))
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [note, setNote] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => { setEditing(false); setConfirmDelete(false); setNote('') }, [leadId])

  if (!lead) return null

  const fail = (err) => dispatch(toastAdded({ kind: 'error', text: err.message }))
  const startEdit = () => { setForm(Object.fromEntries(EDITABLE.map((k) => [k, lead[k] ?? '']))); setEditing(true) }
  const save = async (e) => {
    e.preventDefault()
    const fields = { ...form, value: Number(form.value) || 0 }
    try { await dispatch(updateLead({ id: lead._id, fields })).unwrap(); setEditing(false) } catch (err) { fail(err) }
  }
  const submitNote = async (e) => {
    e.preventDefault()
    if (!note.trim()) return
    try { await dispatch(addNote({ id: lead._id, text: note.trim() })).unwrap(); setNote('') } catch (err) { fail(err) }
  }
  const remove = async () => {
    try { await dispatch(deleteLead(lead._id)).unwrap(); onClose() } catch (err) { fail(err) }
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Lead: ${lead.name}`}>
        <header className="drawer-head">
          <div className="grow">
            <h2>{lead.name || 'Unnamed lead'}</h2>
            <p className="muted">{lead.company || 'No company'} · added {timeAgo(lead.createdAt)}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </header>

        <div className="drawer-body">
          <div>
            <div className="section-title">Stage</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <StatusBadge status={lead.status} />
              <select
                className="select"
                style={{ maxWidth: 200 }}
                value={lead.status}
                aria-label="Move to stage"
                onChange={(e) => dispatch(moveLead({ id: lead._id, status: e.target.value })).unwrap().catch(fail)}
              >
                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Details</span>
              {!editing && <button className="btn btn-ghost btn-sm" onClick={startEdit}>Edit</button>}
            </div>
            {editing ? (
              <form onSubmit={save}>
                <div className="form-row">
                  {EDITABLE.map((k) => (
                    <div className="field" key={k}>
                      <label htmlFor={`f-${k}`}>{k[0].toUpperCase() + k.slice(1)}</label>
                      <input
                        id={`f-${k}`}
                        className="input"
                        type={k === 'value' ? 'number' : k === 'email' ? 'email' : 'text'}
                        min={k === 'value' ? 0 : undefined}
                        required={k === 'name'}
                        value={form[k]}
                        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
                  <button className="btn btn-primary">Save</button>
                </div>
              </form>
            ) : (
              <dl className="kv">
                <dt>Email</dt><dd>{lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : '-'}</dd>
                <dt>Phone</dt><dd>{lead.phone ? <a href={`tel:${lead.phone}`}>{lead.phone}</a> : '-'}</dd>
                <dt>Deal value</dt><dd>{money(lead.value)}</dd>
                <dt>Source</dt><dd>{SOURCE_LABEL[lead.source] || lead.source}{lead.utm?.source ? ` · ${lead.utm.source}/${lead.utm.medium || '-'}` : ''}</dd>
                {lead.utm?.campaign && <><dt>Campaign</dt><dd>{lead.utm.campaign}</dd></>}
                {lead.page && <><dt>Page</dt><dd>{lead.page}</dd></>}
                <dt>First reply</dt><dd>{lead.firstContactAt ? fullDate(lead.firstContactAt) : 'Not yet'}</dd>
              </dl>
            )}
          </div>

          {lead.message && (
            <div>
              <div className="section-title">Message</div>
              <div className="message-box">{lead.message}</div>
            </div>
          )}

          <div>
            <div className="section-title">Notes</div>
            <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
              {[...(lead.notes || [])].reverse().map((n) => (
                <div className="note" key={n._id}>
                  {n.text}
                  <div className="by">{n.by} · {fullDate(n.at)}</div>
                </div>
              ))}
            </div>
            <form onSubmit={submitNote} style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} aria-label="New note" />
              <button className="btn btn-primary" disabled={!note.trim()}>Add</button>
            </form>
          </div>

          <div>
            <div className="section-title">Activity</div>
            <ul className="timeline">
              {[...(lead.activity || [])].reverse().map((a, i) => (
                <li key={i}>
                  <span className="tl-dot" style={a.type === 'status' ? { background: STATUS[a.to]?.color } : undefined} />
                  <div>{activityText(a)}<div className="tl-time">{fullDate(a.at)}</div></div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            {confirmDelete ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="muted">Delete this lead for good?</span>
                <button className="btn btn-sm" onClick={() => setConfirmDelete(false)}>Keep</button>
                <button className="btn btn-sm btn-danger" onClick={remove}>Delete</button>
              </div>
            ) : (
              <button className="btn btn-ghost btn-sm btn-danger" onClick={() => setConfirmDelete(true)}><Icon name="trash" />Delete lead</button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
