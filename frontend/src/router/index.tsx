import { AuthContext } from "../features/auth/AuthContext"
import { useContext, useState, useEffect } from "react"
import { Routes, Route, Navigate } from "react-router-dom"

// Pages
import Dashboard       from "../features/dashboard/pages/DashboardPage"
import Login           from "../features/auth/pages/LoginPage"
import Register        from "../features/auth/pages/RegisterPage"
import Deactivated     from "../features/dashboard/pages/DeactivatedPage"
import ExpiredPassword from "../features/dashboard/pages/ExpiredPasswordPage"
import NotFound        from "../features/dashboard/pages/NotFoundPage"

export default function Router() {
  const { isLoggedIn, user, passwordExpired } = useContext(AuthContext)

  // Lifted here so it survives RootController re-renders.
  // Reset whenever the user logs out (isLoggedIn flips to false).
  const [deactivatedGoToSettings, setDeactivatedGoToSettings] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) setDeactivatedGoToSettings(false)
  }, [isLoggedIn])

  // ── Determine what to render at "/" ──────────────────────────────────────
  // 0. Not logged in              → Login
  // 1. Deactivated                → DeactivatedPage  (highest priority)
  // 2. Active + password expired  → ExpiredPasswordPage
  // 3. Active + OK                → Dashboard
  // ─────────────────────────────────────────────────────────────────────────
  let root: React.ReactNode

  if (!isLoggedIn || !user) {
    root = <Login />
  } else if (!user.is_active && !deactivatedGoToSettings) {
    root = (
      <Deactivated
        onGoToSettings={() => setDeactivatedGoToSettings(true)}
      />
    )
  } else if (user.is_active && passwordExpired) {
    root = <ExpiredPassword />
  } else {
    root = <Dashboard />
  }

  return (
    <Routes>
      <Route path="/"         element={root} />
      <Route path="/login"    element={isLoggedIn ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={isLoggedIn ? <Navigate to="/" /> : <Register />} />
      <Route path="*"         element={<NotFound />} />
    </Routes>
  )
}