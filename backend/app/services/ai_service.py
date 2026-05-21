import os
import re
import time
import logging
from groq import AsyncGroq
from db.connection import get_pool
from datetime import date, timedelta
from dotenv import load_dotenv
from pathlib import Path
from typing import Literal

load_dotenv(dotenv_path=Path(__file__).resolve().parents[3] / ".env")
logger = logging.getLogger(__name__)

# ── Context cache: keyed by (user_id, scope) ─────────────────────────────────
_context_cache: dict[tuple, tuple[dict, float]] = {}
CACHE_TTL = 300  # 5 minutes


def get_groq_client() -> AsyncGroq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set in environment variables")
    return AsyncGroq(
        api_key=api_key,
        max_retries=0,
        timeout=12.0,
    )


# ── Keyword extractor ─────────────────────────────────────────────────────────
def _extract_keywords(message: str) -> list[str]:
    stopwords = {
        "how", "much", "have", "i", "spent", "on", "in", "the", "my", "a",
        "an", "is", "are", "was", "what", "when", "which", "who", "where",
        "show", "me", "all", "for", "from", "to", "of", "and", "or", "do",
        "did", "does", "can", "could", "would", "total", "amount", "transactions",
        "expense", "expenses", "income", "category", "categories", "report",
        "last", "this", "month", "year", "week", "day", "days", "months",
        "february", "march", "april", "may", "june", "july", "august",
        "september", "october", "november", "december", "january",
        "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "jan",
    }
    words = re.findall(r"[a-zA-Z0-9]+", message.lower())
    return [w for w in words if w not in stopwords and len(w) >= 3]


def _build_context_string(ctx: dict, keywords: list[str]) -> str:
    all_txns = ctx["transactions"]

    if keywords:
        matched = [
            t for t in all_txns
            if any(kw in t["description"].lower() for kw in keywords)
        ]
        filtered = matched if matched else all_txns
        label = ", keyword-filtered" if matched else ""
    else:
        filtered = all_txns
        label = ""

    if filtered:
        desc_lines = "\n".join(
            f"  - [{t['date']}] {t['type']} | {t['category']} | ₱{t['amount']:,.2f} | {t['description']}"
            for t in filtered
        )
        desc_section = (
            f"\n=== INDIVIDUAL TRANSACTIONS WITH DESCRIPTIONS "
            f"(last 90 days{label}) ===\n"
            f"Format: [date] type | category | amount | description\n{desc_lines}"
        )
    else:
        desc_section = ""

    return f"""Financial data {ctx['scope']}:

=== LAST 30 DAYS ({ctx['thirty_days_ago']} to {ctx['today']}) ===
{ctx['recent_summary']}

Category Breakdown (last 30 days):
{ctx['recent_breakdown']}

=== ALL-TIME (since {ctx['earliest']}) ===
{ctx['alltime_summary']}

Monthly Breakdown (all-time):
{ctx['monthly_breakdown']}
{desc_section}""".strip()


# ── DB fetch ──────────────────────────────────────────────────────────────────
async def _fetch_context_from_db(
    user_id: int,
    role: str,
    scope: Literal["all", "own"],
) -> dict:
    pool = await get_pool()
    today = date.today()
    ninety_days_ago = today - timedelta(days=90)
    thirty_days_ago = today - timedelta(days=30)

    use_all = (role == "admin" and scope == "all")

    async with pool.acquire() as conn:
        if use_all:
            scope_label = "across all users in the business"

            recent_totals = await conn.fetchrow(
                """
                SELECT
                    COALESCE(SUM(CASE WHEN transaction_type = 'Income' THEN amount ELSE 0 END), 0) AS total_income,
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
                SELECT t.transaction_type, c.name AS category_name,
                       SUM(t.amount) AS total_amount,
                       COUNT(*) AS entry_count
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
                    COALESCE(SUM(CASE WHEN transaction_type = 'Income' THEN amount ELSE 0 END), 0) AS total_income,
                    COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) AS total_expenses,
                    COUNT(*) AS total_transactions,
                    MIN(transaction_date) AS earliest_date
                FROM transactions
                WHERE deleted_at IS NULL
                """,
            )

            monthly_rows = await conn.fetch(
                """
                SELECT DATE_TRUNC('month', transaction_date)::date AS month,
                       COALESCE(SUM(CASE WHEN transaction_type = 'Income' THEN amount ELSE 0 END), 0) AS income,
                       COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) AS expenses
                FROM transactions
                WHERE deleted_at IS NULL
                GROUP BY month
                ORDER BY month ASC
                """,
            )

            transaction_rows = await conn.fetch(
                """
                SELECT t.transaction_type, t.amount, t.description,
                       t.transaction_date, c.name AS category_name
                FROM transactions t
                JOIN categories c ON c.id = t.category_id
                WHERE t.deleted_at IS NULL
                  AND t.description IS NOT NULL
                  AND TRIM(t.description) != ''
                  AND t.transaction_date >= $1
                ORDER BY t.transaction_date DESC
                """,
                ninety_days_ago,
            )

        else:
            scope_label = "for your own transactions"

            recent_totals = await conn.fetchrow(
                """
                SELECT
                    COALESCE(SUM(CASE WHEN transaction_type = 'Income' THEN amount ELSE 0 END), 0) AS total_income,
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
                SELECT t.transaction_type, c.name AS category_name,
                       SUM(t.amount) AS total_amount,
                       COUNT(*) AS entry_count
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
                    COALESCE(SUM(CASE WHEN transaction_type = 'Income' THEN amount ELSE 0 END), 0) AS total_income,
                    COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) AS total_expenses,
                    COUNT(*) AS total_transactions,
                    MIN(transaction_date) AS earliest_date
                FROM transactions
                WHERE deleted_at IS NULL AND user_id = $1
                """,
                user_id,
            )

            monthly_rows = await conn.fetch(
                """
                SELECT DATE_TRUNC('month', transaction_date)::date AS month,
                       COALESCE(SUM(CASE WHEN transaction_type = 'Income' THEN amount ELSE 0 END), 0) AS income,
                       COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) AS expenses
                FROM transactions
                WHERE deleted_at IS NULL AND user_id = $1
                GROUP BY month
                ORDER BY month ASC
                """,
                user_id,
            )

            transaction_rows = await conn.fetch(
                """
                SELECT t.transaction_type, t.amount, t.description,
                       t.transaction_date, c.name AS category_name
                FROM transactions t
                JOIN categories c ON c.id = t.category_id
                WHERE t.deleted_at IS NULL
                  AND t.user_id = $1
                  AND t.description IS NOT NULL
                  AND TRIM(t.description) != ''
                  AND t.transaction_date >= $2
                ORDER BY t.transaction_date DESC
                """,
                user_id, ninety_days_ago,
            )

    def fmt(v): return f"₱{float(v):,.2f}"

    return {
        "scope": scope_label,
        "thirty_days_ago": str(thirty_days_ago),
        "today": str(today),
        "recent_summary": f"Total Income: {fmt(recent_totals['total_income'])}\nTotal Expenses: {fmt(recent_totals['total_expenses'])}\nNet Profit/Loss: {fmt(float(recent_totals['total_income']) - float(recent_totals['total_expenses']))}\nTransactions: {recent_totals['total_transactions']}",
        "recent_breakdown": "\n".join(
            f"  - {r['category_name']} ({r['transaction_type']}): ₱{float(r['total_amount']):,.2f} across {r['entry_count']} transaction(s)"
            for r in recent_rows
        ) or "  No transactions found.",
        "earliest": str(alltime_totals["earliest_date"]),
        "alltime_summary": f"Total Income: {fmt(alltime_totals['total_income'])}\nTotal Expenses: {fmt(alltime_totals['total_expenses'])}\nNet Profit/Loss: {fmt(float(alltime_totals['total_income']) - float(alltime_totals['total_expenses']))}\nTransactions: {alltime_totals['total_transactions']}",
        "monthly_breakdown": "\n".join(
            f"  - {r['month'].strftime('%B %Y')}: Income {fmt(r['income'])} | Expenses {fmt(r['expenses'])} | Net {fmt(float(r['income']) - float(r['expenses']))}"
            for r in monthly_rows
        ) or "  No monthly data found.",
        "transactions": [
            {
                "date": r["transaction_date"].strftime("%Y-%m-%d"),
                "type": r["transaction_type"],
                "category": r["category_name"],
                "amount": float(r["amount"]),
                "description": r["description"].strip(),
            }
            for r in transaction_rows
        ],
    }


async def get_financial_context(user_id: int, role: str, scope: Literal["all", "own"] = "all") -> dict:
    effective_scope = scope if role == "admin" else "own"
    cache_key = (user_id, effective_scope)

    cached = _context_cache.get(cache_key)
    if cached and time.time() - cached[1] < CACHE_TTL:
        return cached[0]

    ctx = await _fetch_context_from_db(user_id, role, effective_scope)
    _context_cache[cache_key] = (ctx, time.time())
    return ctx


async def chat(message: str, history: list[dict], user_id: int, role: str, scope: Literal["all", "own"] = "all") -> str:
    ctx = await get_financial_context(user_id, role, scope)
    keywords = _extract_keywords(message)
    financial_context = _build_context_string(ctx, keywords)

    system_prompt = f"""You are a financial assistant for TransacScope.

RULES:
- Answer directly
- Use correct dataset
- Be concise
- Use ₱ for all amounts
- Stay within finance scope

Financial data:
{financial_context}"""

    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": message})

    client = get_groq_client()
    response = await client.chat.completions.create(
        model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        messages=messages,
        max_tokens=512,
        temperature=0.5,
    )

    return response.choices[0].message.content