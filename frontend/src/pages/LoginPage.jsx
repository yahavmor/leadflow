import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { clearError, demoLogin, login, signup } from '../store/authSlice'
import { Icon } from '../cmps/Icon'

const POINTS = [
  'One webhook for every form: your website, Make, Zapier or a plain HTML form',
  'A drag-and-drop pipeline that updates live when a new lead comes in',
  'Notes, activity history and first-response time for every lead',
  'A dashboard with leads per day, sources and win rate',
]

export function LoginPage() {
  const dispatch = useDispatch()
  const { pending, error } = useSelector((s) => s.auth)
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    if (mode === 'login') dispatch(login({ email: form.email, password: form.password }))
    else dispatch(signup(form))
  }
  const switchMode = () => { dispatch(clearError()); setMode(mode === 'login' ? 'signup' : 'login') }

  return (
    <div className="auth">
      <section className="auth-hero">
        <div className="brand" style={{ padding: 0 }}>
          <span className="brand-mark"><svg viewBox="0 0 24 24"><path d="M5 7h14M7 12h10M10 17h4" /></svg></span>
          <span>LeadFlow</span>
        </div>
        <h1>Every inquiry, from form to closed deal.</h1>
        <p>A lead pipeline for small businesses. Leads arrive from any form or automation, land on a live board, and nobody forgets to call back.</p>
        <ul className="auth-points">
          {POINTS.map((p) => <li key={p}><Icon name="check" />{p}</li>)}
        </ul>
      </section>

      <section className="auth-side">
        <div className="auth-card">
          <h2>{mode === 'login' ? 'Log in' : 'Create an account'}</h2>
          <p className="sub">{mode === 'login' ? 'Welcome back.' : 'Free, and your data stays yours.'}</p>

          <button className="btn btn-accent btn-block" onClick={() => dispatch(demoLogin())} disabled={pending}>
            <Icon name="bolt" />Try the live demo
          </button>
          <div className="or">or</div>

          <form onSubmit={submit}>
            {mode === 'signup' && (
              <div className="field">
                <label htmlFor="name">Name</label>
                <input id="name" className="input" required minLength={2} autoComplete="name" value={form.name} onChange={set('name')} />
              </div>
            )}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" className="input" type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" className="input" type="password" required minLength={mode === 'signup' ? 8 : 1}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={set('password')} />
            </div>
            {error && <p className="error-text" role="alert">{error === 'Demo mode is off' ? 'The demo is not enabled on this server.' : error}</p>}
            <button className="btn btn-primary btn-block" disabled={pending}>{pending ? 'One moment…' : mode === 'login' ? 'Log in' : 'Create account'}</button>
          </form>
          <p className="switch">
            {mode === 'login' ? 'New here? ' : 'Have an account? '}
            <button onClick={switchMode}>{mode === 'login' ? 'Create an account' : 'Log in'}</button>
          </p>
        </div>
      </section>
    </div>
  )
}
