import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { rotateHookToken } from '../store/authSlice'
import { toastAdded } from '../store/uiSlice'
import { sendTestLead } from '../services/http'
import { Icon } from '../cmps/Icon'

const SAMPLES = [
  { name: 'Lihi Gross', email: 'lihi.gross@example.com', phone: '050-7654321', company: 'Gross Physio', message: 'Hi, I would like to hear about appointment reminders.', source: 'website' },
  { name: 'Erez Ben Shimon', email: 'erez@example.com', phone: '052-1112233', company: 'Ben Shimon Accounting', message: 'Can you call me tomorrow morning?', source: 'make' },
  { name: 'Tal Mor', email: 'tal@example.com', company: 'Mor Pilates', message: 'Interested in a trial class flow.', source: 'facebook' },
]

function snippets(url) {
  return {
    html: `<form action="${url}" method="POST">
  <input name="name" placeholder="Name" required>
  <input name="email" type="email" placeholder="Email">
  <input name="phone" placeholder="Phone">
  <textarea name="message"></textarea>
  <!-- spam trap: leave hidden and empty -->
  <input name="website" style="display:none" tabindex="-1" autocomplete="off">
  <input type="hidden" name="_redirect" value="https://your-site.com/thanks">
  <button>Send</button>
</form>`,
    fetch: `await fetch('${url}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, phone, message, source: 'website' }),
})`,
    make: `Module: HTTP > Make a request
URL: ${url}
Method: POST
Body type: Raw (JSON)
Request content:
{
  "name": "{{1.name}}",
  "email": "{{1.email}}",
  "phone": "{{1.phone}}",
  "message": "{{1.message}}",
  "source": "make"
}`,
    curl: `curl -X POST '${url}' \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"Test Lead","email":"test@example.com","source":"webhook"}'`,
  }
}

export function SettingsPage() {
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const [tab, setTab] = useState('html')
  const [copied, setCopied] = useState(false)
  const [confirmRotate, setConfirmRotate] = useState(false)
  const [sending, setSending] = useState(false)
  const url = `${window.location.origin}/api/hook/${user.hookToken}`
  const code = snippets(url)

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* clipboard blocked */ }
  }
  const test = async () => {
    setSending(true)
    const sample = SAMPLES[Math.floor(Math.random() * SAMPLES.length)]
    const res = await sendTestLead(user.hookToken, { ...sample, email: sample.email.replace('@', `+${Date.now() % 10000}@`) })
    setSending(false)
    if (!res.ok) dispatch(toastAdded({ kind: 'error', text: 'The test lead did not go through.' }))
  }
  const rotate = async () => {
    await dispatch(rotateHookToken())
    setConfirmRotate(false)
    dispatch(toastAdded({ text: 'New webhook address created. Update your forms with it.' }))
  }

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Connect a form</h1>
          <p>Send leads to LeadFlow from your website, Make, Zapier or any tool that can make an HTTP request.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="panel panel-pad">
          <h2 style={{ marginBottom: 6 }}>Your webhook address</h2>
          <p className="muted" style={{ marginBottom: 12 }}>Anything posted here becomes a lead in your pipeline. Keep it private: anyone with the address can add leads.</p>
          <div className="copy-row">
            <input className="input" readOnly value={url} aria-label="Webhook URL" onFocus={(e) => e.target.select()} />
            <button className="btn" onClick={copy}><Icon name={copied ? 'check' : 'copy'} />{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <button className="btn btn-accent" onClick={test} disabled={sending}><Icon name="send" />{sending ? 'Sending…' : 'Send a test lead'}</button>
            {confirmRotate ? (
              <>
                <span className="muted" style={{ alignSelf: 'center' }}>Forms using the old address will stop working.</span>
                <button className="btn" onClick={() => setConfirmRotate(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={rotate}>Create new address</button>
              </>
            ) : (
              <button className="btn btn-ghost" onClick={() => setConfirmRotate(true)}><Icon name="refresh" />New address</button>
            )}
          </div>
        </section>

        <section className="panel panel-pad">
          <h2 style={{ marginBottom: 10 }}>Examples</h2>
          <div className="tabs" role="tablist">
            {[['html', 'HTML form'], ['fetch', 'JavaScript'], ['make', 'Make'], ['curl', 'cURL']].map(([id, label]) => (
              <button key={id} className="tab" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
          <pre className="code">{code[tab]}</pre>
        </section>

        <section className="panel panel-pad">
          <h2 style={{ marginBottom: 10 }}>What the webhook accepts</h2>
          <ul className="steps-list">
            <li>JSON or a regular form post. Field names are flexible: <span className="mono">name</span> or <span className="mono">fullName</span>, <span className="mono">phone</span> or <span className="mono">tel</span>, <span className="mono">company</span> or <span className="mono">business</span>.</li>
            <li>UTM tags (<span className="mono">utm_source</span>, <span className="mono">utm_medium</span>, <span className="mono">utm_campaign</span>) are saved with the lead.</li>
            <li>The same email or phone within 24 hours is added as a note on the existing lead, not as a duplicate.</li>
            <li>A hidden <span className="mono">website</span> field works as a spam trap, and requests are rate limited.</li>
          </ul>
        </section>
      </div>
    </>
  )
}
