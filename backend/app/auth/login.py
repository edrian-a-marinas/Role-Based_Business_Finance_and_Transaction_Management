from db.connection import get_pool
from fastapi import HTTPException, Request
from datetime import datetime, timedelta

# ── Rate limit config ─────────────────────────────────────────────────────────
MAX_ATTEMPTS     = 5    # max failed attempts before lockout
LOCKOUT_MINUTES  = 15   # lockout window in minutes
WINDOW_MINUTES   = 15   # rolling window to count attempts in


# ── Log a failed attempt ──────────────────────────────────────────────────────
async def record_failed_attempt(email: str, ip: str | None, conn):
  await conn.execute(
    """
    INSERT INTO login_attempts (email, ip_address, attempted_at)
    VALUES ($1, $2, NOW())
    """,
    email, ip
  )


# ── Count recent failed attempts (by email OR ip) ─────────────────────────────
async def count_recent_attempts(email: str, ip: str | None, conn) -> int:
  since = datetime.utcnow() - timedelta(minutes=WINDOW_MINUTES)

  if ip:
    count = await conn.fetchval(
      """
      SELECT COUNT(*) FROM login_attempts
      WHERE (email = $1 OR ip_address = $2)
        AND attempted_at >= $3
      """,
      email, ip, since
    )
  else:
    count = await conn.fetchval(
      """
      SELECT COUNT(*) FROM login_attempts
      WHERE email = $1
        AND attempted_at >= $2
      """,
      email, since
    )

  return count or 0


# ── Clear attempts on successful login ───────────────────────────────────────
async def clear_attempts(email: str, conn):
  await conn.execute(
    "DELETE FROM login_attempts WHERE email = $1",
    email
  )


# ── Main verify function ──────────────────────────────────────────────────────
async def verify_user(email: str, password: str, ip: str | None = None):
  pool = await get_pool()

  async with pool.acquire() as conn:

    # 1️⃣ Check rate limit BEFORE touching credentials
    recent = await count_recent_attempts(email, ip, conn)
    if recent >= MAX_ATTEMPTS:
      raise HTTPException(
        status_code=429,
        detail=f"Too many failed login attempts. Please wait {LOCKOUT_MINUTES} minutes before trying again."
      )

    # 2️⃣ Check if user exists and is active
    row = await conn.fetchrow(
      "SELECT * FROM users WHERE email = $1 AND is_active = true",
      email
    )

    if not row:
      # Record attempt even for non-existent emails (prevents user enumeration timing attack)
      await record_failed_attempt(email, ip, conn)
      return None

    user = dict(row)

    # 3️⃣ Verify password
    pw_check = await conn.fetchval(
      "SELECT crypt($1, password_hash) = password_hash FROM users WHERE id = $2",
      password, user["id"]
    )

    if not pw_check:
      await record_failed_attempt(email, ip, conn)
      return None

    # 4️⃣ Success — clear attempt history for this email
    await clear_attempts(email, conn)
    return user