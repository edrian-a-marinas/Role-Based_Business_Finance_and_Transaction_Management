from db.connection import get_pool
from app.schemas.users import UserBase
import logging
from datetime import timedelta, datetime, timezone
logger = logging.getLogger(__name__)

# Only the Super Admin can demote other admins or perform unrestricted actions
SUPER_ADMIN_ID = 1


async def get_user_by_id(user_id: int) -> dict | None:
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      row = await conn.fetchrow("SELECT * FROM users WHERE id=$1", user_id)
      return dict(row) if row else None
  except Exception:
    logger.exception(f"Error fetching user by id: {user_id}")
    raise


async def get_user_by_email(email: str) -> dict | None:
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      row = await conn.fetchrow("SELECT * FROM users WHERE email=$1", email)
      return dict(row) if row else None
  except Exception:
    logger.exception(f"Error fetching user by email: {email}")
    raise


async def get_all_users() -> list[dict]:
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      rows = await conn.fetch(
        """
        SELECT
          u.id,
          u.email,
          u.role_id,
          u.first_name,
          u.middle_name,
          u.last_name,
          u.phone_number,
          u.is_active,
          u.created_at,
          COUNT(t.id) AS transaction_count
        FROM users u
        LEFT JOIN transactions t ON t.user_id = u.id AND t.deleted_at IS NULL
        GROUP BY u.id
        ORDER BY
          CASE WHEN u.id = 1 THEN 0
              WHEN u.role_id = 1 THEN 1
              ELSE 2
          END,
          u.id ASC
        """
      )
      return [dict(row) for row in rows]
  except Exception:
    logger.exception("Error fetching all users")
    raise


async def update_user_role(user_id: int, new_role_id: int, current_user_id: int, current_user_role: str) -> dict | None:
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():
        target_user = await conn.fetchrow("SELECT id, role_id FROM users WHERE id=$1", user_id)
        if not target_user:
          return None
        if user_id == SUPER_ADMIN_ID:
          return None
        if current_user_id != SUPER_ADMIN_ID:
          return None
        if new_role_id not in [1, 2]:
          return None
        row = await conn.fetchrow(
          """
          UPDATE users
          SET role_id=$1
          WHERE id=$2
          RETURNING id, email, first_name, middle_name, last_name,
            phone_number, role_id, is_active, created_at
          """,
          new_role_id,
          user_id,
        )
        return dict(row) if row else None
  except Exception:
    logger.exception(f"Error updating role for user_id: {user_id}")
    raise


async def update_user_active(user_id: int, is_active: bool, current_user_id: int, current_user_role: str) -> dict | None:
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():
        target_user = await conn.fetchrow("SELECT id, role_id FROM users WHERE id=$1", user_id)
        if not target_user:
          return None
        if user_id == SUPER_ADMIN_ID:
          return None
        if current_user_id == SUPER_ADMIN_ID:
          row = await conn.fetchrow(
            "UPDATE users SET is_active=$1 WHERE id=$2 RETURNING id, email, is_active",
            is_active, user_id,
          )
          return dict(row) if row else None
        if current_user_role != "admin":
          return None
        if target_user["role_id"] != 2:
          return None
        row = await conn.fetchrow(
          "UPDATE users SET is_active=$1 WHERE id=$2 RETURNING id, email, is_active",
          is_active, user_id,
        )
        return dict(row) if row else None
  except Exception:
    logger.exception(f"Error updating active status for user_id: {user_id}")
    raise


async def restore_user(user_id: int, current_user_id: int, current_user_role: str) -> bool | None:
  if user_id == SUPER_ADMIN_ID:
    return None
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():
        target_user = await conn.fetchrow("SELECT id, role_id FROM users WHERE id=$1", user_id)
        if not target_user:
          return None
        if current_user_id == SUPER_ADMIN_ID:
          await conn.execute("UPDATE users SET is_active=true WHERE id=$1", user_id)
          return True
        if current_user_role != "admin":
          return None
        if target_user["role_id"] != 2:
          return None
        await conn.execute("UPDATE users SET is_active=true WHERE id=$1", user_id)
        return True
  except Exception:
    logger.exception(f"Error restoring user_id: {user_id}")
    raise


async def soft_delete_user(user_id: int, current_user_id: int, current_user_role: str) -> bool | None:
  if user_id == SUPER_ADMIN_ID:
    return None
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():
        target_user = await conn.fetchrow("SELECT id, role_id FROM users WHERE id=$1", user_id)
        if not target_user:
          return None
        if current_user_id == SUPER_ADMIN_ID:
          await conn.execute("UPDATE users SET is_active=false WHERE id=$1", user_id)
          return True
        if current_user_role != "admin":
          return None
        if target_user["role_id"] != 2:
          return None
        await conn.execute("UPDATE users SET is_active=false WHERE id=$1", user_id)
        return True
  except Exception:
    logger.exception(f"Error soft deleting user_id: {user_id}")
    raise


async def hard_delete_user(user_id: int, current_user_id: int) -> bool | None:
  if user_id == SUPER_ADMIN_ID:
    return None
  if user_id != current_user_id:
    return None
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():
        await conn.execute("DELETE FROM users WHERE id=$1", user_id)
        return True
  except Exception:
    logger.exception(f"Error hard deleting user_id: {user_id}")
    raise


async def update_self_info(user_id: int, payload: UserBase) -> dict:
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():
        row = await conn.fetchrow(
          """
          UPDATE users
          SET first_name=$1, middle_name=$2, last_name=$3, phone_number=$4
          WHERE id=$5
          RETURNING id, email, role_id, first_name, middle_name, last_name,
            phone_number, is_active, created_at
          """,
          payload.first_name,
          payload.middle_name,
          payload.last_name,
          payload.phone_number,
          user_id,
        )
        return dict(row)
  except Exception:
    logger.exception(f"Error updating self info for user_id: {user_id}")
    raise


PASSWORD_REUSE_DAYS = 7

async def change_password(user_id: int, current_password: str, new_password: str) -> bool | str | None:
  """
  All hashing uses pgcrypto's crypt()/gen_salt('bf') to stay consistent with
  registration (register.py: crypt($2, gen_salt('bf'))) and login
  (login.py: crypt($1, password_hash) = password_hash).
  Never use Python bcrypt here — the hash formats are incompatible with pgcrypto.
  """
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():

        # ── 1. Verify current password using pgcrypto (same as login) ────────
        row = await conn.fetchrow("SELECT password_hash FROM users WHERE id=$1", user_id)
        if not row:
          return None

        pw_ok = await conn.fetchval(
          "SELECT crypt($1, password_hash) = password_hash FROM users WHERE id=$2",
          current_password, user_id,
        )
        if not pw_ok:
          return False

        # ── 2. Check reuse: compare new password against recent history ───────
        # History hashes were stored by pgcrypto too, so use crypt() to verify.
        cutoff = datetime.now(timezone.utc) - timedelta(days=PASSWORD_REUSE_DAYS)
        recent = await conn.fetch(
          "SELECT password_hash FROM password_history WHERE user_id=$1 AND created_at >= $2",
          user_id, cutoff,
        )
        for record in recent:
          reused = await conn.fetchval(
            "SELECT crypt($1, $2) = $2",
            new_password, record["password_hash"],
          )
          if reused:
            return "reused"

        # ── 3. Save current hash to history before overwriting ────────────────
        await conn.execute(
          "INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)",
          user_id, row["password_hash"],
        )

        # ── 4. Hash new password with pgcrypto and update users table ─────────
        new_hash = await conn.fetchval(
          "SELECT crypt($1, gen_salt('bf'))",
          new_password,
        )
        await conn.execute(
          "UPDATE users SET password_hash=$1 WHERE id=$2",
          new_hash, user_id,
        )

        # ── 5. Save new hash to history ───────────────────────────────────────
        await conn.execute(
          "INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)",
          user_id, new_hash,
        )

        return True

  except Exception:
    logger.exception(f"Error changing password for user_id: {user_id}")
    raise


PASSWORD_EXPIRY_DAYS = 90

async def get_password_expiry(user_id: int) -> datetime | None:
  """
  Returns the datetime when the user's current password expires (last change + 90 days).
  Returns None if the user has never changed their password (no history row).
  """
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      row = await conn.fetchrow(
        "SELECT MAX(created_at) AS last_changed FROM password_history WHERE user_id=$1",
        user_id,
      )
      if not row or row["last_changed"] is None:
        return None
      return row["last_changed"] + timedelta(days=PASSWORD_EXPIRY_DAYS)
  except Exception:
    logger.exception(f"Error fetching password expiry for user_id: {user_id}")
    raise