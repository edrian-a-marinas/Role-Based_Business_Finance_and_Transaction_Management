# TransacScope

**Role-Based Business Finance & Transaction Management System**

> A finance management web app built for small businesses — track income and expenses, manage staff access, generate reports, and stay in control of your cash flow.

🔗 **Live:** [transacscope.vercel.app](https://transacscope.vercel.app) &nbsp;·&nbsp; 🎬 **Demo Video:** [Watch here](https://drive.google.com/file/d/1fXCICTBrgaCmMWBpuK1JLUi5SkQ1x5tR/view?usp=sharing)

---

## What It Does

TransacScope gives businesses a centralized system to record every income and expense, control who can do what based on their role, and generate financial reports — daily, weekly, or monthly.

---

## Roles

| Role | What They Can Do |
|------|-----------------|
| **Super Admin** | Full control — users, roles, categories, and all transactions |
| **Admin** | Manages categories, views all transactions, handles deletion requests |
| **Standard User** | Manages their own transactions, can request deletions |

---

## Features

### 💰 Transactions
- Record income and expenses with category, amount, date, and description
- Edit your own transactions; admins can view everyone's
- Full edit history — every change is logged with who did it and when
- Staff request deletions instead of deleting directly — admins approve or decline; soft delete only, nothing is permanently lost

### 📊 Dashboard & Reports
- Live KPI cards — total income, expenses, net profit, and transaction count
- Charts — Income vs Expense, Net Profit trend, Category Breakdown (bar, line, pie)
- Generate reports filtered by date range, type, and user — downloadable as PDF
- Role-aware: admins see everyone, standard users see only their own

### 🤖 AI Financial Assistant
- Conversational AI chat panel in the Reports page — powered by Groq (LLaMA 3.3 70B)
- Reads live financial data — last 30 days, all-time, and 90-day transaction history; cached 5 minutes per user
- Answers questions about income, expenses, net profit, category breakdowns, and specific transactions
- Admins can toggle between **All Users** and **My Data** without losing chat history
- Suggestion chips, slow-reply hints, and rate limit errors with exact retry time

### 🗂️ Categories
- Fully customizable income and expense categories — admins can add, edit, and delete anytime; defaults included out of the box

### 👥 User Management
- View all users with account status, transaction count, and full transaction history per user
- Super Admin can promote/demote users and activate/deactivate accounts
- Deactivated users are locked to Settings only until reactivated or deleted

### 🔔 Notifications
- Admins notified on deletion requests; users notified on approval or decline — click to jump directly to that request

### 🔒 Security
- Email verification on registration — 6-digit code with resend cooldown and max send limit
- JWT auth on all protected endpoints; rate limiting on all critical routes via SlowAPI
- Frontend lockout after 5 failed login attempts — 3-minute countdown
- Passwords expire every 90 days with forced change gate; 7-day password reuse prevention
- CORS restrictions, trusted host validation, security headers (HSTS, X-Frame-Options, CSP)
- No stack traces or internal errors exposed in production

### ⚙️ Settings
- Update profile, change password (with live expiry date), and delete account with a 10-second safety countdown
- Password expiry warning toast appears up to 7 days before expiry

### 🖥️ UX
- Light and dark mode; 13 modal components covering every user interaction
- Server status topbar — shows when backend is down and when it reconnects
- Role-gated navigation — each role only sees what's relevant to them

---

## Docker

```bash
docker build -t transacscope .
docker run -p 8000:8000 transacscope
```

---

## API Endpoints

39 endpoints across 7 routers — all JWT-protected except `/health` and auth routes.

### Auth `/api/auth`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | Login — returns JWT token |
| POST | `/register` | Register new account with verified code |
| POST | `/send-code` | Send email verification code |
| GET | `/me` | Get current authenticated user |

### Transactions `/api/transactions`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List transactions (own or all, by role) |
| POST | `/` | Create a transaction |
| GET | `/{id}` | Get transaction by ID |
| PUT | `/{id}` | Update a transaction |
| DELETE | `/{id}` | Soft delete a transaction |
| GET | `/history` | Full edit audit log |
| POST | `/request-deletion` | Request deletion (Standard User) |
| GET | `/deletion-requests` | List pending deletion requests (Admin+) |
| PATCH | `/deletion-requests/{id}` | Approve or decline a request |
| DELETE | `/deletion-requests/{id}` | Cancel a deletion request |
| GET | `/deletion-requests/my-history` | Own deletion request history |
| GET | `/count-by-category/{id}` | Transaction count per category |

### Categories `/api/categories`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all categories |
| POST | `/` | Create a category |
| PUT | `/{id}` | Update a category |
| DELETE | `/{id}` | Delete a category |

### Users `/api/users`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all users with transaction count |
| GET | `/me` | Get own profile |
| PATCH | `/me` | Update own profile |
| PATCH | `/me/password` | Change password |
| GET | `/me/password-expiry` | Get password expiry date |
| GET | `/{id}` | Get user by ID |
| PUT | `/{id}/role` | Promote or demote user (Super Admin) |
| PATCH | `/{id}/status` | Activate or deactivate user (Super Admin) |
| DELETE | `/me` | Delete own account |

### Reports `/api/reports`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List generated reports |
| POST | `/generate` | Generate a report |
| GET | `/{id}/download` | Download report as PDF |

### AI `/api/ai`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat` | Send a message — returns AI reply with role-scoped context |
| GET | `/context` | Fetch financial context for the current user (cached 5 min) |

### Notifications `/api/notifications`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List notifications |
| PATCH | `/{id}/read` | Mark notification as read |
| PATCH | `/read-all` | Mark all as read |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Backend health check |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python, FastAPI, PostgreSQL, asyncpg, Pydantic, SlowAPI |
| Frontend | React, TypeScript, React Query, Vite, Tailwind CSS, Zod, Axios |
| AI | Groq API (LLaMA 3.3 70B), role-aware context, 5-min DB cache |
| Auth | JWT, bcrypt, email verification |
| Testing | pytest — 119 tests covering auth, transactions, categories, users, and role enforcement |
| Deployed | Render · Vercel · Supabase |

---

*Built by Edrian Mariñas — 2026*