from db.connection import get_pool

# READ: all categories (global)
async def get_categories():
  pool = await get_pool()
  async with pool.acquire() as conn:
    rows = await conn.fetch(
      """
      SELECT id, name, description, created_at
      FROM categories
      ORDER BY name ASC
      """
    )
    return rows

# READ: single category
async def get_category_by_id(category_id: int):
  pool = await get_pool()
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      """
      SELECT id, name, description, created_at
      FROM categories
      WHERE id = $1
      """,
      category_id
    )
    return row

# CREATE: admin only
async def create_category(name: str, description: str):
  pool = await get_pool()
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      """
      INSERT INTO categories (name, description)
      VALUES ($1, $2)
      RETURNING id, name, description, created_at
      """,
      name,
      description
    )
    return row

# UPDATE: admin only
async def update_category(category_id: int, name: str = None, description: str = None):
  pool = await get_pool()
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      """
      UPDATE categories
      SET name = COALESCE($1, name),
          description = COALESCE($2, description)
      WHERE id = $3
      RETURNING id, name, description, created_at
      """,
      name,
      description,
      category_id
    )
    return row

# DELETE: admin only
async def delete_category(category_id: int):
  pool = await get_pool()
  async with pool.acquire() as conn:
    # Optional: prevent deletion if transactions exist
    exists = await conn.fetchval(
      """
      SELECT EXISTS(
        SELECT 1 FROM transactions WHERE category_id = $1
      )
      """,
      category_id
    )
    if exists:
      return False
    result = await conn.execute(
      """
      DELETE FROM categories
      WHERE id = $1
      """,
      category_id
    )
    return result
