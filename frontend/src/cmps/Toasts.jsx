import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { toastDismissed } from '../store/uiSlice'
import { Icon } from './Icon'

function Toast({ toast }) {
  const dispatch = useDispatch()
  const [, setParams] = useSearchParams()
  const dismiss = () => dispatch(toastDismissed(toast.id))

  useEffect(() => {
    const t = setTimeout(dismiss, toast.kind === 'error' ? 7000 : 6000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id])

  return (
    <div className={`toast ${toast.kind}`} role="status">
      <Icon name={toast.kind === 'error' ? 'x' : 'bolt'} />
      <div className="grow">
        {toast.title && <b style={{ display: 'block' }}>{toast.title}</b>}
        {toast.text}
        {toast.leadId && (
          <div>
            <button style={{ color: '#3dd6c1', fontWeight: 600, marginTop: 4 }} onClick={() => { setParams({ lead: toast.leadId }); dismiss() }}>
              Open lead
            </button>
          </div>
        )}
      </div>
      <button onClick={dismiss} aria-label="Dismiss"><Icon name="x" /></button>
    </div>
  )
}

export function Toasts() {
  const toasts = useSelector((s) => s.ui.toasts)
  return <div className="toasts" aria-live="polite">{toasts.map((t) => <Toast key={t.id} toast={t} />)}</div>
}
