from db.connection import get_pool

async def verify_user(email: str, password: str):
  pool = await get_pool()
  async with pool.acquire() as conn:
    # Only fetch active users
    row = await conn.fetchrow(
      "SELECT * FROM users WHERE email=$1 AND is_active=true",
      email
    )
    if not row:
      return None

    user = dict(row)
    # Verify password using Postgres crypt function
    pw_check = await conn.fetchval(
      "SELECT crypt($1, password_hash) = password_hash FROM users WHERE id=$2",
      password, user["id"]
    )
    if not pw_check:
      return None

    return user
