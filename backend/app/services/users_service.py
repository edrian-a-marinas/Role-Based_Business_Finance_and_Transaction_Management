from db.connection import get_pool

SUPER_ADMIN_ID = 1  # Only this user can demote other admins

# READ user by ID
async def get_user_by_id(user_id: int):
  pool = await get_pool()
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      "SELECT * FROM users WHERE id=$1",
      user_id
    )
    return dict(row) if row else None

# CREATE user (registration, default role=2)
async def create_user(user: "UserCreate", hashed_password: str):
  pool = await get_pool()
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      """
      INSERT INTO users (email, password_hash, role_id, first_name, middle_name, last_name, phone_number, request_admin)
      VALUES ($1, $2, 2, $3, $4, $5, $6, false)
      RETURNING id, email, role_id, first_name, middle_name, last_name, phone_number, is_active, created_at, request_admin
      """,
      user.email,
      hashed_password,
      user.first_name,
      user.middle_name,
      user.last_name,
      user.phone_number
    )
    return dict(row)

# UPDATE user role (admin only)
async def update_user_role(user_id: int, new_role_id: int, current_user_id: int, current_user_role: str):
  if current_user_role != "admin":
    return None

  pool = await get_pool()
  async with pool.acquire() as conn:
    target_user = await conn.fetchrow(
      "SELECT id, role_id FROM users WHERE id=$1",
      user_id
    )
    if not target_user:
      return None

    # Demote admin restriction: only super admin can demote admins
    if target_user["role_id"] == 1 and new_role_id != 1:
      if current_user_id != SUPER_ADMIN_ID:
        return None  # normal admin cannot demote other admins

    row = await conn.fetchrow(
      "UPDATE users SET role_id=$1, request_admin=false WHERE id=$2 RETURNING id, email, role_id",
      new_role_id,
      user_id
    )
    return dict(row) if row else None

# Standard user requests admin
async def request_admin(user_id: int):
  pool = await get_pool()
  async with pool.acquire() as conn:
    await conn.execute(
      "UPDATE users SET request_admin=true WHERE id=$1",
      user_id
    )
    return True

# SOFT DELETE user (admin only)
async def soft_delete_user(user_id: int, current_user_role: str):
  if current_user_role != "admin":
    return None
  pool = await get_pool()
  async with pool.acquire() as conn:
    await conn.execute(
      "UPDATE users SET is_active=false WHERE id=$1",
      user_id
    )
    return True

# HARD DELETE user (self only)
async def hard_delete_user(user_id: int, current_user_id: int):
  if user_id != current_user_id:
    return None
  pool = await get_pool()
  async with pool.acquire() as conn:
    await conn.execute(
      "DELETE FROM users WHERE id=$1",
      user_id
    )
    return True

# GET all users (admin only)
async def get_all_users(current_user_role: str):
  if current_user_role != "admin":
    return []
  pool = await get_pool()
  async with pool.acquire() as conn:
    rows = await conn.fetch(
      """
      SELECT id, email, role_id, first_name, middle_name, last_name, phone_number, is_active, created_at, request_admin
      FROM users
      ORDER BY created_at DESC
      """
    )
    return [dict(row) for row in rows]






# services/users_service.py
async def update_self_info(user_id: int, payload: UserBase):
  pool = await get_pool()
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      """
      UPDATE users
      SET first_name=$1, middle_name=$2, last_name=$3, phone_number=$4
      WHERE id=$5
      RETURNING id, email, role_id, first_name, middle_name, last_name, phone_number, is_active, created_at, request_admin
      """,
      payload.first_name,
      payload.middle_name,
      payload.last_name,
      payload.phone_number,
      user_id
    )
    return dict(row)
