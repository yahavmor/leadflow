import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { createLead } from '../store/leadsSlice'

const EMPTY = { name: '', email: '', phone: '', company: '', value: '', message: '' }

export function AddLeadModal({ onClose, onCreated }) {
  const dispatch = useDispatch()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const lead = await dispatch(createLead({ ...form, value: Number(form.value) || 0 })).unwrap()
      onCreated?.(lead)
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal-wrap" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <form className="modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="add-lead-title">
          <h2 id="add-lead-title">Add a lead</h2>
          <div className="field">
            <label htmlFor="al-name">Name</label>
            <input id="al-name" className="input" required autoFocus value={form.name} onChange={set('name')} />
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="al-email">Email</label><input id="al-email" className="input" type="email" value={form.email} onChange={set('email')} /></div>
            <div className="field"><label htmlFor="al-phone">Phone</label><input id="al-phone" className="input" value={form.phone} onChange={set('phone')} /></div>
            <div className="field"><label htmlFor="al-company">Company</label><input id="al-company" className="input" value={form.company} onChange={set('company')} /></div>
            <div className="field"><label htmlFor="al-value">Deal value (₪)</label><input id="al-value" className="input" type="number" min="0" value={form.value} onChange={set('value')} /></div>
          </div>
          <div className="field">
            <label htmlFor="al-msg">Notes from the first contact</label>
            <textarea id="al-msg" className="textarea" value={form.message} onChange={set('message')} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Add lead'}</button>
          </div>
        </form>
      </div>
    </>
  )
}
