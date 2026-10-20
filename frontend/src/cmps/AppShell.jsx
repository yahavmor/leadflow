import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { NavLink, Outlet, useSearchParams } from 'react-router-dom'
import { logout } from '../store/authSlice'
import { LeadDrawer } from './LeadDrawer'
import { Toasts } from './Toasts'
import { Icon } from './Icon'

const NAV = [
  { to: '/', label: 'Pipeline', icon: 'board', end: true },
  { to: '/leads', label: 'All leads', icon: 'list' },
  { to: '/dashboard', label: 'Dashboard', icon: 'chart' },
  { to: '/settings', label: 'Connect a form', icon: 'plug' },
]

export function AppShell() {
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const live = useSelector((s) => s.ui.live)
  const [params, setParams] = useSearchParams()
  const openLead = params.get('lead')
  const closeLead = useCallback(() => {
    const next = new URLSearchParams(params)
    next.delete('lead')
    setParams(next)
  }, [params, setParams])

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Main">
        <NavLink to="/" className="brand">
          <span className="brand-mark"><svg viewBox="0 0 24 24"><path d="M5 7h14M7 12h10M10 17h4" /></svg></span>
          <span>LeadFlow</span>
        </NavLink>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
            <Icon name={n.icon} /><span>{n.label}</span>
          </NavLink>
        ))}
        <div className="sidebar-foot">
          <span className={`live${live ? ' on' : ''}`} title={live ? 'New leads appear instantly' : 'Reconnecting'}>{live ? 'live' : 'offline'}</span>
          <div className="user-row">
            <span className="who">{user?.name}{user?.isDemo && <span className="demo-pill">demo</span>}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => dispatch(logout())} aria-label="Log out" title="Log out"><Icon name="logout" /></button>
          </div>
        </div>
      </nav>
      <main className="main">
        <Outlet />
      </main>
      {openLead && <LeadDrawer leadId={openLead} onClose={closeLead} />}
      <Toasts />
    </div>
  )
}
