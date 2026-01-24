import asyncpg

DB_CONFIG = {
  "host": "localhost",
  "port": 5432,
  "user": "postgres",
  "password": "edrian127",
  "database": "transac_db"
}

_pool = None

async def get_pool():
  global _pool
  if _pool is None:
    _pool = await asyncpg.create_pool(**DB_CONFIG)
  return _pool

