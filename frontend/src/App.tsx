import { useHealthCheck } from "./services/useHealthCheck"
import { BrowserRouter } from "react-router-dom"

import Router from "./router"

import { AuthProvider } from "./contexts/AuthContext"

import './styles/dashboard.css'
//import './styles/login.css'
//import './styles/register.css'

function App() {
  useHealthCheck()

  return (
    <AuthProvider>
      <BrowserRouter>
        <Router />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App