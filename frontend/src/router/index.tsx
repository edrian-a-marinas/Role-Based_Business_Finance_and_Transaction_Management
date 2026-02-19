import { AuthContext } from "../features/auth/AuthContext"
import { useContext } from "react"

import { Routes, Route, Navigate } from "react-router-dom"

// Pages
import Dashboard from "../features/dashboard/pages/DashboardPage"
import Login from "../features/auth/pages/LoginPage"
import Register from "../features/auth/pages/RegisterPage"



function RootController() {
  const { isLoggedIn } = useContext(AuthContext)

  return isLoggedIn ? <Dashboard /> : <Login /> 
}


export default function Router() {
  const { isLoggedIn } = useContext(AuthContext)

  return (
    <Routes>
      <Route path="/" element={<RootController />} />

      <Route path="/login" element={isLoggedIn ? <Navigate to="/" /> : <Login />} /> 
      <Route path="/register" element={isLoggedIn ? <Navigate to="/" /> : <Register />} />  

    </Routes>
  )
}
