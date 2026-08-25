import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AgentDetailPage } from './pages/AgentDetail'
import { DashboardPage } from './pages/Dashboard'
import { NewAgentPage } from './pages/NewAgent'
import { SettingsPage } from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/agents/new" element={<NewAgentPage />} />
          <Route path="/agents/:id" element={<AgentDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
