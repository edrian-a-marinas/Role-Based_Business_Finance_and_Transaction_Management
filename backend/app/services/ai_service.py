import os
import logging
from groq import AsyncGroq
from db.connection import get_pool
from datetime import date, timedelta
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).resolve().parents[3] / ".env")
logger = logging.getLogger(__name__)


def get_groq_client() -> AsyncGroq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set in environment variables")
    return AsyncGroq(api_key=api_key)


async def get_financial_context(user_id: int, role: str) -> str:
    """
    Pull a financial summary from the DB.
    - Recent (last 30 days): detailed category breakdown
    - All-time: totals + monthly breakdown
    - Individual transactions with descriptions (last 500, non-empty descriptions)
    Admins see all users; standard users see only their own.
    """
    try:
        pool = await get_pool()
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)

        async with pool.acquire() as conn:
            if role == "admin":
                scope = "across all users in the business"

                recent_totals = await conn.fetchrow(
                    """
                    SELECT
                        COALESCE(SUM(CASE WHEN transaction_type = 'Income'  THEN amount ELSE 0 END), 0) AS total_income,
                        COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) AS total_expenses,
                        COUNT(*) AS total_transactions
                    FROM transactions
                    WHERE deleted_at IS NULL
                      AND transaction_date BETWEEN $1 AND $2
                    """,
                    thirty_days_ago, today,
                )

                recent_rows = await conn.fetch(
                    """
                    SELECT
                        t.transaction_type,
                        c.name AS category_name,
                        SUM(t.amount)  AS total_amount,
                        COUNT(*)       AS entry_count
                    FROM transactions t
                    JOIN categories c ON c.id = t.category_id
                    WHERE t.deleted_at IS NULL
                      AND t.transaction_date BETWEEN $1 AND $2
                    GROUP BY t.transaction_type, c.name
                    ORDER BY total_amount DESC
                    """,
                    thirty_days_ago, today,
                )

                alltime_totals = await conn.fetchrow(
                    """
                    SELECT
                        COALESCE(SUM(CASE WHEN transaction_type = 'Income'  THEN amount ELSE 0 END), 0) AS total_income,
                        COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) AS total_expenses,
                        COUNT(*) AS total_transactions,
                        MIN(transaction_date) AS earliest_date
                    FROM transactions
                    WHERE deleted_at IS NULL
                    """,
                )

                monthly_rows = await conn.fetch(
                    """
                    SELECT
                        DATE_TRUNC('month', transaction_date)::date AS month,
                        COALESCE(SUM(CASE WHEN transaction_type = 'Income'  THEN amount ELSE 0 END), 0) AS income,
                        COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) AS expenses
                    FROM transactions
                    WHERE deleted_at IS NULL
                    GROUP BY month
                    ORDER BY month ASC
                    """,
                )

                transaction_rows = await conn.fetch(
                    """
                    SELECT
                        t.transaction_type,
                        t.amount,
                        t.description,
                        t.transaction_date,
                        c.name AS category_name
                    FROM transactions t
                    JOIN categories c ON c.id = t.category_id
                    WHERE t.deleted_at IS NULL
                      AND t.description IS NOT NULL
                      AND TRIM(t.description) != ''
                    ORDER BY t.transaction_date DESC
                    LIMIT 500
                    """,
                )

            else:
                scope = "for your own transactions"

                recent_totals = await conn.fetchrow(
                    """
                    SELECT
                        COALESCE(SUM(CASE WHEN transaction_type = 'Income'  THEN amount ELSE 0 END), 0) AS total_income,
                        COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) AS total_expenses,
                        COUNT(*) AS total_transactions
                    FROM transactions
                    WHERE deleted_at IS NULL
                      AND user_id = $1
                      AND transaction_date BETWEEN $2 AND $3
                    """,
                    user_id, thirty_days_ago, today,
                )

                recent_rows = await conn.fetch(
                    """
                    SELECT
                        t.transaction_type,
                        c.name AS category_name,
                        SUM(t.amount)  AS total_amount,
                        COUNT(*)       AS entry_count
                    FROM transactions t
                    JOIN categories c ON c.id = t.category_id
                    WHERE t.deleted_at IS NULL
                      AND t.user_id = $1
                      AND t.transaction_date BETWEEN $2 AND $3
                    GROUP BY t.transaction_type, c.name
                    ORDER BY total_amount DESC
                    """,
                    user_id, thirty_days_ago, today,
                )

                alltime_totals = await conn.fetchrow(
                    """
                    SELECT
                        COALESCE(SUM(CASE WHEN transaction_type = 'Income'  THEN amount ELSE 0 END), 0) AS total_income,
                        COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) AS total_expenses,
                        COUNT(*) AS total_transactions,
                        MIN(transaction_date) AS earliest_date
                    FROM transactions
                    WHERE deleted_at IS NULL
                      AND user_id = $1
                    """,
                    user_id,
                )

                monthly_rows = await conn.fetch(
                    """
                    SELECT
                        DATE_TRUNC('month', transaction_date)::date AS month,
                        COALESCE(SUM(CASE WHEN transaction_type = 'Income'  THEN amount ELSE 0 END), 0) AS income,
                        COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) AS expenses
                    FROM transactions
                    WHERE deleted_at IS NULL
                      AND user_id = $1
                    GROUP BY month
                    ORDER BY month ASC
                    """,
                    user_id,
                )

                transaction_rows = await conn.fetch(
                    """
                    SELECT
                        t.transaction_type,
                        t.amount,
                        t.description,
                        t.transaction_date,
                        c.name AS category_name
                    FROM transactions t
                    JOIN categories c ON c.id = t.category_id
                    WHERE t.deleted_at IS NULL
                      AND t.user_id = $1
                      AND t.description IS NOT NULL
                      AND TRIM(t.description) != ''
                    ORDER BY t.transaction_date DESC
                    LIMIT 500
                    """,
                    user_id,
                )

        # ── Format ────────────────────────────────────────────────────────────
        def fmt(v): return f"₱{float(v):,.2f}"

        # Recent summary
        r_income   = float(recent_totals["total_income"])
        r_expenses = float(recent_totals["total_expenses"])
        r_net      = r_income - r_expenses
        r_count    = recent_totals["total_transactions"]

        recent_breakdown = "\n".join(
            f"  - {row['category_name']} ({row['transaction_type']}): "
            f"{fmt(row['total_amount'])} across {row['entry_count']} transaction(s)"
            for row in recent_rows
        ) or "  No transactions found."

        # All-time summary
        a_income   = float(alltime_totals["total_income"])
        a_expenses = float(alltime_totals["total_expenses"])
        a_net      = a_income - a_expenses
        a_count    = alltime_totals["total_transactions"]
        earliest   = alltime_totals["earliest_date"]

        monthly_breakdown = "\n".join(
            f"  - {row['month'].strftime('%B %Y')}: "
            f"Income {fmt(row['income'])} | Expenses {fmt(row['expenses'])} | Net {fmt(float(row['income']) - float(row['expenses']))}"
            for row in monthly_rows
        ) or "  No monthly data found."

        # Individual transactions with descriptions
        transactions_with_desc = "\n".join(
            f"  - [{row['transaction_date'].strftime('%Y-%m-%d')}] {row['transaction_type']} | "
            f"{row['category_name']} | {fmt(row['amount'])} | {row['description'].strip()}"
            for row in transaction_rows
        ) or "  No transactions with descriptions found."

        context = f"""
Financial data {scope}:

=== LAST 30 DAYS ({thirty_days_ago} to {today}) ===
Total Income:      {fmt(r_income)}
Total Expenses:    {fmt(r_expenses)}
Net Profit/Loss:   {fmt(r_net)}
Transactions:      {r_count}

Category Breakdown (last 30 days):
{recent_breakdown}

=== ALL-TIME (since {earliest}) ===
Total Income:      {fmt(a_income)}
Total Expenses:    {fmt(a_expenses)}
Net Profit/Loss:   {fmt(a_net)}
Transactions:      {a_count}

Monthly Breakdown (all-time):
{monthly_breakdown}

=== INDIVIDUAL TRANSACTIONS WITH DESCRIPTIONS (most recent 500) ===
Format: [date] type | category | amount | description
{transactions_with_desc}
""".strip()

        return context

    except Exception:
        logger.exception("Error fetching financial context for AI")
        return "Financial data is currently unavailable."


async def chat(
    message: str,
    history: list[dict],
    user_id: int,
    role: str,
) -> str:
    try:
        financial_context = await get_financial_context(user_id, role)

        system_prompt = f"""You are a financial assistant for TransacScope. You're friendly, casual, and helpful — like a knowledgeable friend who knows their numbers.

RULES:
1. Answer what was asked first, then you can add one short relevant follow-up thought or offer more detail — but never volunteer data the user didn't ask for as the main answer.
2. If the user asks for a specific date range and you have it, answer it directly and completely. Give context (e.g. a per-month breakdown if they asked for a range), not just a single number.
3. You have access to individual transaction descriptions — use them to answer questions about specific items, merchants, or keywords the user mentions.
4. If you genuinely don't have the data they need, say so briefly and suggest the Reports section.
5. No "great question!", no lectures, no unsolicited advice paragraphs.
6. Use ₱ for all amounts. Keep it conversational — short paragraphs or a clean list, not walls of text.

You have access to the following financial data:
{financial_context}"""

        messages = [{"role": "system", "content": system_prompt}]
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": message})

        client = get_groq_client()
        response = await client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            messages=messages,  # type: ignore
            max_tokens=512,
            temperature=0.5,
        )

        reply = response.choices[0].message.content
        logger.info(f"AI chat response for user_id={user_id} role={role}")
        return reply  # type: ignore

    except Exception:
        logger.exception("Error getting AI chat response")
        raise