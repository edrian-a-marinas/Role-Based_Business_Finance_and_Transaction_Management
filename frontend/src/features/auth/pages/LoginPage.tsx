// src/pages/auth/Login.tsx
import { useState, useContext, useEffect, useRef } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { validateLogin } from "../schemas/login"
import type { LoginForm } from "../schemas/login"
import { UserSchema } from "../schemas/userAuth"
import api from "../../../services/apiClient"
import { AuthContext } from "../AuthContext"
import { Link } from "react-router-dom"

// ── Design tokens mirroring DashboardPage sidebar ────────────────────────────
const S = {
  bg:         "hsl(220,25%,10%)",
  bgDeep:     "hsl(220,28%,7%)",
  surface:    "hsl(220,20%,14%)",
  accent:     "hsl(220,20%,16%)",
  accentFg:   "hsl(220,14%,90%)",
  primary:    "hsl(199,89%,48%)",
  primaryDim: "hsl(199,89%,38%)",
  muted:      "hsl(220,10%,46%)",
  border:     "hsl(220,20%,18%)",
  foreground: "hsl(220,14%,85%)",
  income:     "hsl(160,60%,45%)",
  expense:    "hsl(0,72%,51%)",
}

// ── Particle type ─────────────────────────────────────────────────────────────
interface Particle {
  id: number
  x: number
  duration: number
  opacity: number
  color: string
  label: string
  fontSize: number
}

const LABELS = ["+₱240", "-₱85", "+₱1,200", "-₱340", "+₱67", "-₱22", "+₱890", "-₱430", "+₱3,500", "-₱120"]
const COLORS  = [S.income, S.primary, S.expense, S.primary, S.income]
let _pid = 0

function makeParticle(): Particle {
  const id = _pid++
  return {
    id,
    x:        Math.random() * 88 + 4,
    duration: Math.random() * 14 + 16,
    opacity:  Math.random() * 0.055 + 0.025,
    color:    COLORS[id % COLORS.length],
    label:    LABELS[id % LABELS.length],
    fontSize: Math.random() * 2 + 9,
  }
}

// ── Frontend rate limit config (mirrors backend) ──────────────────────────────
const FE_MAX_ATTEMPTS    = 5
const FE_LOCKOUT_MINUTES = 3
const LOCKOUT_KEY        = "login_lockout"   // localStorage key

interface LockoutData {
  attempts:  number
  lockedUntil: number | null  // timestamp ms, null = not locked
}

function getLockout(): LockoutData {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY)
    if (!raw) return { attempts: 0, lockedUntil: null }
    return JSON.parse(raw) as LockoutData
  } catch {
    return { attempts: 0, lockedUntil: null }
  }
}

function saveLockout(data: LockoutData) {
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(data))
}

function clearLockout() {
  localStorage.removeItem(LOCKOUT_KEY)
}

export default function Login() {
  const { setLoggedIn, setUser } = useContext(AuthContext)
  const [form, setForm]         = useState<LoginForm>({ email: "", password: "" })
  const [errors, setErrors]     = useState<string[]>([])
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState("")
  const [mounted, setMounted]   = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])

  // ── Frontend lockout state ─────────────────────────────────────────────────
  const [lockedUntil, setLockedUntil]   = useState<number | null>(null)
  const [lockCountdown, setLockCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Card mount animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  // Particle spawner
  useEffect(() => {
    let alive = true
    function scheduleNext() {
      const delay = Math.random() * 7000 + 7000
      timerRef.current = setTimeout(() => {
        if (!alive) return
        const p = makeParticle()
        setParticles(prev => [...prev, p])
        setTimeout(() => {
          setParticles(prev => prev.filter(x => x.id !== p.id))
        }, (p.duration + 2) * 1000)
        scheduleNext()
      }, delay)
    }
    scheduleNext()
    return () => {
      alive = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // Restore lockout from localStorage on mount
  useEffect(() => {
    const data = getLockout()
    if (data.lockedUntil && data.lockedUntil > Date.now()) {
      setLockedUntil(data.lockedUntil)
    } else if (data.lockedUntil) {
      // Lockout expired while away — clear it
      clearLockout()
    }
  }, [])

  // Lockout countdown ticker
  useEffect(() => {
    if (!lockedUntil) { setLockCountdown(0); return }
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setLockedUntil(null)
        setLockCountdown(0)
        clearLockout()
      } else {
        setLockCountdown(remaining)
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [lockedUntil])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (loading || lockedUntil) return

    setErrors([])
    setMessage("")

    const validationErrors = validateLogin(form)
    if (validationErrors.length > 0) { setErrors(validationErrors); return }

    setLoading(true)
    try {
      const response = await api.post("api/auth/login", form)
      const { access_token, token_type, user } = response.data
      const parsedUser = UserSchema.parse(user)
      localStorage.setItem("access_token", access_token)
      localStorage.setItem("token_type", token_type)

      // ── Success: clear any frontend lockout ──
      clearLockout()
      setLoggedIn(true)
      setUser(parsedUser)

    } catch (err: any) {
      if (!err.response) {
        setErrors(["Cannot connect to server."])
        return
      }

      const status = err.response.status

      // ── Backend enforced lockout (429) ────────────────────────────────────
      if (status === 429) {
        const until = Date.now() + FE_LOCKOUT_MINUTES * 60 * 1000
        setLockedUntil(until)
        saveLockout({ attempts: FE_MAX_ATTEMPTS, lockedUntil: until })
        setErrors([])
        return
      }

      // ── Failed attempt — increment frontend counter ───────────────────────
      if (status === 401) {
        const data    = getLockout()
        const newAttempts = data.attempts + 1

        if (newAttempts >= FE_MAX_ATTEMPTS) {
          const until = Date.now() + FE_LOCKOUT_MINUTES * 60 * 1000
          saveLockout({ attempts: newAttempts, lockedUntil: until })
          setLockedUntil(until)
          setErrors([])
        } else {
          saveLockout({ attempts: newAttempts, lockedUntil: null })
          const remaining = FE_MAX_ATTEMPTS - newAttempts
          setErrors([
            `Invalid credentials or inactive account — ${remaining} attempt${remaining === 1 ? "" : "s"} remaining`
          ])
        }
        return
      }

      if (status === 500) setErrors(["Internal server error. Try again later."])
      else                setErrors(["Login failed. Try again later."])

    } finally {
      setLoading(false)
    }
  }

  // ── Format countdown mm:ss ────────────────────────────────────────────────
  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0")
    const s = (secs % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  const isLocked = !!lockedUntil && lockedUntil > Date.now()

  return (
    <>
      <title>TransacScope — Sign In</title>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${S.bgDeep};
          position: relative;
          overflow: hidden;
        }

        .login-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 15% 50%, hsl(199 89% 48% / 0.06) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 85% 20%, hsl(220 25% 20% / 0.4) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 75% 85%, hsl(160 60% 45% / 0.04) 0%, transparent 50%);
          pointer-events: none;
        }

        .login-root::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(hsl(220 20% 18% / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, hsl(220 20% 18% / 0.3) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
          mask-image: radial-gradient(ellipse 90% 90% at 50% 50%, black 30%, transparent 100%);
        }

        @keyframes floatOnce {
          0%   { transform: translateY(0);      opacity: 0; }
          8%   { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translateY(-105vh); opacity: 0; }
        }

        .particle {
          position: absolute;
          bottom: -2%;
          font-family: 'DM Mono', monospace;
          font-weight: 500;
          white-space: nowrap;
          pointer-events: none;
          letter-spacing: 0.02em;
          animation: floatOnce linear forwards;
        }

        .login-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 420px;
          margin: 1.5rem;
          background: ${S.surface};
          border: 1px solid ${S.border};
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow:
            0 0 0 1px hsl(220 20% 20% / 0.5),
            0 24px 64px hsl(220 28% 4% / 0.6),
            0 0 80px hsl(199 89% 48% / 0.04);
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .login-card.mounted { opacity: 1; transform: translateY(0); }

        .logo-row { display: flex; align-items: center; gap: 10px; margin-bottom: 2rem; }
        .logo-icon-wrap {
          width: 36px; height: 36px; border-radius: 10px;
          background: hsl(199 89% 48% / 0.12);
          border: 1px solid hsl(199 89% 48% / 0.25);
          display: flex; align-items: center; justify-content: center;
        }
        .logo-icon-wrap img { width: 20px; height: 20px; }
        .logo-name { font-size: 15px; font-weight: 700; letter-spacing: -0.02em; color: ${S.foreground}; }

        .card-title { font-size: 26px; font-weight: 700; letter-spacing: -0.03em; color: ${S.accentFg}; margin-bottom: 6px; line-height: 1.15; }
        .card-subtitle { font-size: 13px; color: ${S.muted}; margin-bottom: 2rem; font-weight: 400; }
        .accent-line {
          width: 36px; height: 3px; border-radius: 2px;
          background: linear-gradient(90deg, ${S.primary}, hsl(199 89% 48% / 0.3));
          margin-bottom: 2rem;
        }

        .error-box {
          background: hsl(0 72% 51% / 0.08); border: 1px solid hsl(0 72% 51% / 0.25);
          border-radius: 10px; padding: 10px 14px; margin-bottom: 1.25rem;
        }
        .error-box p { font-size: 12.5px; color: hsl(0,72%,65%); line-height: 1.5; }

        /* Lockout box */
        .lockout-box {
          background: hsl(45 85% 50% / 0.08);
          border: 1px solid hsl(45 85% 50% / 0.25);
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 1.25rem;
          text-align: center;
        }
        .lockout-title {
          font-size: 13px; font-weight: 600;
          color: hsl(45,85%,65%);
          margin-bottom: 4px;
        }
        .lockout-timer {
          font-size: 26px; font-weight: 700;
          font-family: 'DM Mono', monospace;
          color: hsl(45,85%,60%);
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .lockout-sub {
          font-size: 11.5px;
          color: hsl(45,85%,40%);
        }

        .field-group { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }
        .field-wrap  { display: flex; flex-direction: column; gap: 6px; }
        .field-label { font-size: 11.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: ${S.muted}; }
        .field-input {
          width: 100%; background: ${S.accent}; border: 1px solid ${S.border};
          border-radius: 10px; padding: 11px 14px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; color: ${S.accentFg};
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .field-input::placeholder { color: hsl(220,10%,34%); }
        .field-input:focus { border-color: ${S.primary}; box-shadow: 0 0 0 3px hsl(199 89% 48% / 0.12); }
        .field-input:disabled { opacity: 0.4; cursor: not-allowed; }

        .submit-btn {
          width: 100%; padding: 12px 20px; border-radius: 10px; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
          letter-spacing: 0.01em; color: hsl(220,28%,7%);
          background: linear-gradient(135deg, ${S.primary} 0%, hsl(199 89% 42%) 100%);
          box-shadow: 0 4px 16px hsl(199 89% 48% / 0.25), 0 1px 3px hsl(0 0% 0% / 0.2);
          transition: opacity 0.15s, transform 0.12s, box-shadow 0.15s;
          position: relative; overflow: hidden;
        }
        .submit-btn::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, hsl(0 0% 100% / 0.1) 0%, transparent 60%);
          pointer-events: none;
        }
        .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px hsl(199 89% 48% / 0.35), 0 2px 6px hsl(0 0% 0% / 0.2); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .btn-inner { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .spinner {
          width: 14px; height: 14px;
          border: 2px solid hsl(220 28% 7% / 0.3); border-top-color: hsl(220 28% 7%);
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .card-footer { margin-top: 1.5rem; text-align: center; font-size: 13px; color: ${S.muted}; }
        .card-footer a { color: ${S.primary}; text-decoration: none; font-weight: 600; transition: color 0.15s; }
        .card-footer a:hover { color: hsl(199,89%,62%); }

        .card-divider { height: 1px; background: ${S.border}; margin: 1.5rem 0; }

        .stats-row { display: flex; gap: 1rem; justify-content: center; }
        .stat-badge { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
        .stat-num { font-size: 13px; font-weight: 700; font-family: 'DM Mono', monospace; color: ${S.foreground}; }
        .stat-lbl { font-size: 10px; color: ${S.muted}; letter-spacing: 0.04em; text-transform: uppercase; }
        .stat-dot { width: 6px; height: 6px; border-radius: 50%; margin-bottom: 2px; }
      `}</style>

      <div className="login-root">

        {particles.map((p) => (
          <span
            key={p.id}
            className="particle"
            style={{
              left:              `${p.x}%`,
              color:             p.color,
              opacity:           p.opacity,
              fontSize:          `${p.fontSize}px`,
              animationDuration: `${p.duration}s`,
            }}
          >
            {p.label}
          </span>
        ))}

        <div className={`login-card${mounted ? " mounted" : ""}`}>

          <div className="logo-row">
            <div className="logo-icon-wrap">
              <img src="/vite.svg" alt="TransacScope" />
            </div>
            <span className="logo-name">TransacScope</span>
          </div>

          <h1 className="card-title">Welcome back</h1>
          <p className="card-subtitle">Sign in to your account to continue</p>
          <div className="accent-line" />

          {/* ── Lockout banner ── */}
          {isLocked && (
            <div className="lockout-box">
              <p className="lockout-title">⚠ Too many failed attempts</p>
              <p className="lockout-timer">{formatCountdown(lockCountdown)}</p>
              <p className="lockout-sub">Please wait before trying again</p>
            </div>
          )}

          {/* ── Errors ── */}
          {!isLocked && errors.length > 0 && (
            <div className="error-box">
              {errors.map((err, i) => <p key={i}>⚠ {err}</p>)}
            </div>
          )}

          {message && (
            <div style={{ color: S.income, fontSize: 13, marginBottom: "1rem" }}>{message}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <div className="field-wrap">
                <label className="field-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  className="field-input"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  disabled={isLocked}
                  required
                />
              </div>
              <div className="field-wrap">
                <label className="field-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  className="field-input"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  disabled={isLocked}
                  required
                />
              </div>
            </div>

            <button className="submit-btn" type="submit" disabled={loading || isLocked}>
              <span className="btn-inner">
                {loading && <span className="spinner" />}
                {loading ? "Signing in…" : isLocked ? `Locked — ${formatCountdown(lockCountdown)}` : "Sign In"}
              </span>
            </button>
          </form>

          <div className="card-divider" />
          <div className="stats-row">
            <div className="stat-badge">
              <div className="stat-dot" style={{ background: S.income }} />
              <span className="stat-num">₱ —</span>
              <span className="stat-lbl">Income</span>
            </div>
            <div className="stat-badge">
              <div className="stat-dot" style={{ background: S.expense }} />
              <span className="stat-num">₱ —</span>
              <span className="stat-lbl">Expense</span>
            </div>
            <div className="stat-badge">
              <div className="stat-dot" style={{ background: S.primary }} />
              <span className="stat-num">₱ —</span>
              <span className="stat-lbl">Net</span>
            </div>
          </div>

          <p className="card-footer" style={{ marginTop: "1.25rem" }}>
            Don't have an account?{" "}
            <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </>
  )
}