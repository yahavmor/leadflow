import { Suspense, lazy, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, Route, Routes } from 'react-router-dom'
import { fetchMe } from './store/authSlice'
import { fetchLeads, leadRemoved, leadUpserted, reset } from './store/leadsSlice'
import { liveChanged, toastAdded } from './store/uiSlice'
import { connectSocket, disconnectSocket } from './services/socket'
import { SOURCE_LABEL } from './utils/format'
import { AppShell } from './cmps/AppShell'
import { LoginPage } from './pages/LoginPage'
import { BoardPage } from './pages/BoardPage'
import { LeadsPage } from './pages/LeadsPage'
import { SettingsPage } from './pages/SettingsPage'

// chart.js is only needed on the dashboard, so it loads on demand
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))

export function App() {
  const dispatch = useDispatch()
  const { user, checked } = useSelector((s) => s.auth)
  const userId = user?._id

  useEffect(() => { dispatch(fetchMe()) }, [dispatch])

  // load the pipeline and listen for live updates while logged in
  useEffect(() => {
    if (!userId) {
      disconnectSocket()
      dispatch(reset())
      return
    }
    dispatch(fetchLeads())
    connectSocket({
      connect: () => dispatch(liveChanged(true)),
      disconnect: () => dispatch(liveChanged(false)),
      'lead-added': (lead) => {
        dispatch(leadUpserted(lead))
        dispatch(toastAdded({ title: `New lead: ${lead.name || lead.email}`, text: `via ${SOURCE_LABEL[lead.source] || lead.source}`, leadId: lead._id }))
      },
      'lead-updated': (lead) => dispatch(leadUpserted(lead)),
      'lead-removed': (data) => dispatch(leadRemoved(data)),
    })
    return () => disconnectSocket()
  }, [userId, dispatch])

  if (!checked) return <div className="splash">Loading…</div>
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<BoardPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="dashboard" element={<Suspense fallback={<div className="empty">Loading the numbers…</div>}><DashboardPage /></Suspense>} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
