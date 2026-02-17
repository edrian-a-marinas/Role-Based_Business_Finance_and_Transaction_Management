// src/pages/auth/Login.tsx
import { useState } from "react"
import { validateLogin } from "../../schemas/login"
import type { LoginForm } from "../../schemas/login"
import axios from "axios"

export default function Login() {
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" })
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  // Update form fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])
    setMessage("")

    // Client-side validation
    const validationErrors = validateLogin(form)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)
    try {
      const response = await axios.post("/auth/login", form)
      // Backend returns: { access_token, token_type }
      console.log("Login success:", response.data)
      setMessage("Login successful!")
      // You can store token in localStorage or context for later
      // localStorage.setItem("access_token", response.data.access_token)
    } catch (err: any) {
      if (err.response?.status === 401) {
        setErrors(["Invalid credentials or inactive account"])
      } else {
        setErrors(["Login failed. Try again later."])
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <h1>Login</h1>
      {errors.length > 0 && (
        <div className="errors">
          {errors.map((err, i) => (
            <p key={i} style={{ color: "red" }}>{err}</p>
          ))}
        </div>
      )}
      {message && <p style={{ color: "green" }}>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Password:</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  )
}
