import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { statsApi } from '../services/http'
import { STATUSES, SOURCE_LABEL, hours, money, percent } from '../utils/format'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)
ChartJS.defaults.font.family = "'IBM Plex Sans', system-ui, sans-serif"
ChartJS.defaults.color = '#6c7a93'

const PALETTE = ['#0e9f8f', '#2563eb', '#7c3aed', '#d97706', '#db2777', '#0891b2', '#64748b']

function Kpi({ label, value, hint }) {
  return (
    <div className="panel kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  )
}

export function DashboardPage() {
  const leadsVersion = useSelector((s) => s.leads.items.map((l) => `${l._id}:${l.status}:${l.value}`).join('|'))
  const [days, setDays] = useState(14)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const t = setTimeout(() => {
      statsApi.get(days).then((s) => alive && setStats(s)).catch((e) => alive && setError(e.message))
    }, 150)
    return () => { alive = false; clearTimeout(t) }
  }, [days, leadsVersion])

  if (error) return <div className="empty">Could not load the dashboard: {error}</div>
  if (!stats) return <div className="empty">Loading the numbers…</div>

  const perDay = {
    labels: stats.perDay.map((d) => new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })),
    datasets: [{ label: 'New leads', data: stats.perDay.map((d) => d.count), backgroundColor: '#0e9f8f', borderRadius: 6, maxBarThickness: 26 }],
  }
  const funnel = {
    labels: STATUSES.map((s) => s.label),
    datasets: [{ label: 'Leads', data: STATUSES.map((s) => stats.byStatus[s.id].count), backgroundColor: STATUSES.map((s) => s.color), borderRadius: 6, maxBarThickness: 22 }],
  }
  const sources = Object.entries(stats.bySource).sort((a, b) => b[1] - a[1])
  const bySource = {
    labels: sources.map(([s]) => SOURCE_LABEL[s] || s),
    datasets: [{ data: sources.map(([, n]) => n), backgroundColor: PALETTE, borderWidth: 0 }],
  }
  const grid = { grid: { color: '#eef1f6' }, border: { display: false } }

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Dashboard</h1>
          <p>How many leads come in, where from, and how fast they get an answer.</p>
        </div>
        <select className="select" style={{ width: 150 }} value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Time range">
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      <div className="kpis">
        <Kpi label="Total leads" value={stats.total} hint={`${stats.perDay.reduce((s, d) => s + d.count, 0)} in the last ${days} days`} />
        <Kpi label="Win rate" value={percent(stats.winRate)} hint="Won out of closed deals" />
        <Kpi label="Open pipeline" value={money(stats.openPipelineValue)} hint={`${money(stats.wonValue)} won so far`} />
        <Kpi label="Avg. first response" value={hours(stats.avgFirstResponseHours)} hint="From form to first move" />
      </div>

      <div className="charts">
        <div className="panel panel-pad">
          <h2 style={{ marginBottom: 12 }}>New leads per day</h2>
          <div className="chart-box">
            <Bar data={perDay} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ...grid, grid: { display: false } }, y: { ...grid, beginAtZero: true, ticks: { precision: 0 } } } }} />
          </div>
        </div>
        <div className="panel panel-pad">
          <h2 style={{ marginBottom: 12 }}>Where leads come from</h2>
          <div className="chart-box">
            <Doughnut data={bySource} options={{ maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true } } } }} />
          </div>
        </div>
        <div className="panel panel-pad" style={{ gridColumn: '1 / -1' }}>
          <h2 style={{ marginBottom: 12 }}>Leads by stage</h2>
          <div className="chart-box" style={{ height: 220 }}>
            <Bar data={funnel} options={{ indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ...grid, beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false }, border: { display: false } } } }} />
          </div>
        </div>
      </div>
    </>
  )
}
