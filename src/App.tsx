import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RequireAdmin, RequireViewer } from './components/AccessGate'
import { AuthProvider } from './components/AuthProvider'
import { Layout } from './components/Layout'
import { AgentDetailPage } from './pages/AgentDetail'
import { DashboardPage } from './pages/Dashboard'
import { LoginPage } from './pages/Login'
import { NewAgentPage } from './pages/NewAgent'
import { SettingsPage } from './pages/Settings'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route
              path="/"
              element={
                <RequireViewer>
                  <DashboardPage />
                </RequireViewer>
              }
            />
            <Route
              path="/agents/new"
              element={
                <RequireAdmin>
                  <NewAgentPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/agents/:id"
              element={
                <RequireViewer>
                  <AgentDetailPage />
                </RequireViewer>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAdmin>
                  <SettingsPage />
                </RequireAdmin>
              }
            />
            <Route path="/login" element={<LoginPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
