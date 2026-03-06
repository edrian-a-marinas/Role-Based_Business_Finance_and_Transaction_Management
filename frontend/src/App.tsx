import { BrowserRouter } from "react-router-dom"

import { ServerStatus } from "@/services/useHealthCheck"
import Router from "@/router"
import { AuthProvider }  from "@/features/auth/AuthContext"
import { ThemeProvider } from "@/features/dashboard/lib/ThemeContext"

function App() {
  return (
    <ServerStatus>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Router />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ServerStatus>
  )
}

export default App