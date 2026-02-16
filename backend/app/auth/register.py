from db.connection import get_pool
from app.schemas.users import UserCreate

async def create_user(user: UserCreate):
  pool = await get_pool()
  async with pool.acquire() as conn:
    query = """
    INSERT INTO users (email, password_hash, first_name, middle_name, last_name, phone_number, role_id)
    VALUES (
      $1,
      crypt($2, gen_salt('bf')),
      $3, $4, $5, $6,
      2
    )
    RETURNING id, email, first_name, middle_name, last_name, phone_number, role_id, is_active, created_at, request_admin;
    """
    values = (
      user.email,
      user.password,
      user.first_name,
      user.middle_name,
      user.last_name,
      user.phone_number
    )
    row = await conn.fetchrow(query, *values)
    return dict(row) if row else None