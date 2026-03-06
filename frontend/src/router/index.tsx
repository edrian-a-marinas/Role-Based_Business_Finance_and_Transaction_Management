import { AuthContext } from "../features/auth/AuthContext"
import { useContext, useState } from "react"
import { Routes, Route, Navigate } from "react-router-dom"

// Pages
import Dashboard  from "../features/dashboard/pages/DashboardPage"
import Login      from "../features/auth/pages/LoginPage"
import Register   from "../features/auth/pages/RegisterPage"
import Deactivated from "../features/dashboard/pages/DeactivatedPage"

import NotFound   from "../features/dashboard/pages/NotFoundPage"

function RootController() {
  const { isLoggedIn, user } = useContext(AuthContext)

  // Track if a deactivated user has clicked "Go to Settings"
  const [deactivatedGoToSettings, setDeactivatedGoToSettings] = useState(false)

  if (!isLoggedIn) return <Login />

  // Deactivated: show holding page unless they chose to go to Settings
  if (!user?.is_active && !deactivatedGoToSettings) {
    return (
      <Deactivated
        onGoToSettings={() => setDeactivatedGoToSettings(true)}
      />
    )
  }

  // Active user, or deactivated user who chose Settings — show dashboard
  // (DashboardPage's existing gate locks nav to Settings-only when !is_active)
  return <Dashboard />
}

export default function Router() {
  const { isLoggedIn } = useContext(AuthContext)

  return (
    <Routes>
      <Route path="/"         element={<RootController />} />
      <Route path="/login"    element={isLoggedIn ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={isLoggedIn ? <Navigate to="/" /> : <Register />} />
      <Route path="*"         element={<NotFound />} />
    </Routes>
  )
}