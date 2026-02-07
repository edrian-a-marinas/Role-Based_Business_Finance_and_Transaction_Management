# transactions_service.py → CRUD + queries + aggregation for transactions


from db.connection import get_pool

async def create_transaction(tx):
  pool = await get_pool()
  async with pool.acquire() as conn:
    await conn.execute(
      """
      INSERT INTO transactions (amount, category_id, description, date)
      VALUES ($1, $2, $3, $4)
      """,
      tx.amount, tx.category_id, tx.description, tx.date
    )
  return {"message": "Transaction created"}
