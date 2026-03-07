from db.connection import get_pool
import json
import logging

logger = logging.getLogger(__name__)

# Only the Super Admin can perform unrestricted category actions
SUPER_ADMIN_ID = 1


async def get_categories():
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      rows = await conn.fetch(
        """
        SELECT * FROM categories
        WHERE deleted_at IS NULL
        """
      )
      return [dict(row) for row in rows]
  except Exception:
    logger.exception("Error fetching categories")
    raise


async def expense_categories():
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      rows = await conn.fetch(
        """
        SELECT * FROM categories
        WHERE type = 'Expense'
          AND deleted_at IS NULL
        """
      )
      return [dict(row) for row in rows]
  except Exception:
    logger.exception("Error fetching expense categories")
    raise


async def income_categories():
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      rows = await conn.fetch(
        """
        SELECT * FROM categories
        WHERE type = 'Income'
          AND deleted_at IS NULL
        """
      )
      return [dict(row) for row in rows]
  except Exception:
    logger.exception("Error fetching income categories")
    raise


async def get_category_by_id(ctg_id: int):
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      row = await conn.fetchrow(
        """
        SELECT id, name, description, type, created_at
        FROM categories
        WHERE id = $1
          AND deleted_at IS NULL
        """,
        ctg_id
      )
      return dict(row) if row else None
  except Exception:
    logger.exception(f"Error fetching category id: {ctg_id}")
    raise


async def create_category(ctg, current_user_id: int, role: str):
  # Allow super admin (by ID) or admin (by role)
  if current_user_id != SUPER_ADMIN_ID and role != "admin":
    return None

  if ctg.type not in ("Expense", "Income"):
    raise ValueError("Category type must be 'Expense' or 'Income'")

  # Treat empty description as None to avoid min_length=5 violation
  description = ctg.description if ctg.description and ctg.description.strip() else None

  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():
        row = await conn.fetchrow(
          """
          INSERT INTO categories (name, description, type)
          VALUES ($1, $2, $3)
          RETURNING id, name, description, type, created_at
          """,
          ctg.name,
          description,
          ctg.type
        )
        return dict(row) if row else None
  except Exception:
    logger.exception("Error creating category")
    raise


async def update_category(ctg_id: int, ctg, current_user_id: int, role: str):
  # Allow super admin (by ID) or admin (by role)
  if current_user_id != SUPER_ADMIN_ID and role != "admin":
    return None

  description = ctg.description if ctg.description and ctg.description.strip() else None

  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():
        old = await conn.fetchrow(
          "SELECT * FROM categories WHERE id = $1",
          ctg_id
        )
        if not old:
          return None

        updated = await conn.fetchrow(
          """
          UPDATE categories
          SET
            name        = COALESCE($1, name),
            description = COALESCE($2, description),
            type        = COALESCE($3, type)
          WHERE id = $4
          RETURNING id, name, description, type, created_at
          """,
          ctg.name,
          description,
          ctg.type,
          ctg_id
        )

        await conn.execute(
          """
          INSERT INTO log_history (
            entity_type, entity_id, user_id, action, old_data, new_data, action_taken_at
          )
          VALUES ('category', $1, $2, 'updated', $3::jsonb, $4::jsonb, now())
          """,
          ctg_id,
          current_user_id,
          json.dumps({"name": old["name"], "description": old["description"], "type": old["type"]}),
          json.dumps({"name": updated["name"], "description": updated["description"], "type": updated["type"]})
        )
        return dict(updated)
  except Exception:
    logger.exception(f"Error updating category id: {ctg_id}")
    raise


async def delete_category(ctg_id: int, current_user_id: int, role: str):
  # Allow super admin (by ID) or admin (by role)
  if current_user_id != SUPER_ADMIN_ID and role != "admin":
    return None

  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():
        old = await conn.fetchrow(
          "SELECT * FROM categories WHERE id = $1",
          ctg_id
        )
        if not old:
          return None

        await conn.execute(
          "UPDATE categories SET deleted_at = now() WHERE id = $1",
          ctg_id
        )

        await conn.execute(
          """
          INSERT INTO log_history (
            entity_type, entity_id, user_id, action, old_data, action_taken_at
          )
          VALUES ('category', $1, $2, 'soft-deleted', $3::jsonb, now())
          """,
          ctg_id,
          current_user_id,
          json.dumps({"name": old["name"], "description": old["description"]})
        )
        return True
  except Exception:
    logger.exception(f"Error soft deleting category id: {ctg_id}")
    raise