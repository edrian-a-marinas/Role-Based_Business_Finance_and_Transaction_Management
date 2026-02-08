# app/services/reports_service.py

from db.connection import get_pool

# Monthly summary by category
async def monthly_summary(user_id: int, year: int, month: int):
  pool = await get_pool()
  async with pool.acquire() as conn:
    rows = await conn.fetch(
      """
      SELECT c.name AS category,
        SUM(t.amount) AS total
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = $1
        AND EXTRACT(YEAR FROM t.date) = $2
        AND EXTRACT(MONTH FROM t.date) = $3
      GROUP BY c.name
      ORDER BY total DESC
      """,
      user_id,
      year,
      month
    )
    return rows


# Daily totals (for charts)
async def daily_totals(user_id: int, start_date, end_date):
  pool = await get_pool()
  async with pool.acquire() as conn:
    rows = await conn.fetch(
      """
      SELECT date,
             SUM(amount) AS total
      FROM transactions
      WHERE user_id = $1
        AND date BETWEEN $2 AND $3
      GROUP BY date
      ORDER BY date ASC
      """,
      user_id,
      start_date,
      end_date
    )
    return rows


# Overall summary
async def overall_summary(user_id: int):
  pool = await get_pool()
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      """
      SELECT
        COUNT(*) AS transaction_count,
        SUM(amount) AS total_amount,
        AVG(amount) AS average_amount
      FROM transactions
      WHERE user_id = $1
      """,
      user_id
    )
    return row
