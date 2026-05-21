import os
import re
import time
import logging
from groq import AsyncGroq
from db.connection import get_pool
from datetime import date, timedelta
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).resolve().parents[3] / ".env")
logger = logging.getLogger(__name__)

# ── In-memory context cache (per user, 5 min TTL) ──────────────────
_context_cache: dict[int, tuple[str, float]] = {}  # user_id -> (context, timestamp)
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


# ── Keyword extractor ───────────────────────────────────────────────
def _extract_keywords(message: str) -> list[str]:
    """Pull meaningful words from the user message to filter descriptions."""
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


def _filter_descriptions(rows: list, keywords: list[str]) -> list:
    """Return only rows whose description matches at least one keyword."""
    if not keywords:
        return rows
    return [
        row for row in rows
        if any(kw in row["description"].lower() for kw in keywords)
    ]


async def _fetch_context_from_db(user_id: int, role: str) -> str:
    pool = await get_pool()
    today = date.today()
    # last 90 days for descriptions instead of all-time 500
    ninety_days_ago = today - timedelta(days=90)
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

            #  90 days only, not 500 all-time
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
                  AND t.transaction_date >= $1
                ORDER BY t.transaction_date DESC
                """,
                ninety_days_ago,
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

            # Option 1: 90 days only
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
                  AND t.transaction_date >= $2
                ORDER BY t.transaction_date DESC
                """,
                user_id, ninety_days_ago,
            )

    # ── Format ────────────────────────────────────────────────────────────────
    def fmt(v): return f"₱{float(v):,.2f}"

    r_income   = float(recent_totals["total_income"])
    r_expenses = float(recent_totals["total_expenses"])
    r_net      = r_income - r_expenses
    r_count    = recent_totals["total_transactions"]

    recent_breakdown = "\n".join(
        f"  - {row['category_name']} ({row['transaction_type']}): "
        f"{fmt(row['total_amount'])} across {row['entry_count']} transaction(s)"
        for row in recent_rows
    ) or "  No transactions found."

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

    # Store raw transaction rows on the context object for Option 2 filtering later
    # We store them serialized so the cache holds everything needed
    transactions_with_desc = [
        {
            "date": row["transaction_date"].strftime("%Y-%m-%d"),
            "type": row["transaction_type"],
            "category": row["category_name"],
            "amount": float(row["amount"]),
            "description": row["description"].strip(),
        }
        for row in transaction_rows
    ]

    context = {
        "scope": scope,
        "thirty_days_ago": str(thirty_days_ago),
        "today": str(today),
        "recent_summary": f"Total Income: {fmt(r_income)}\nTotal Expenses: {fmt(r_expenses)}\nNet Profit/Loss: {fmt(r_net)}\nTransactions: {r_count}",
        "recent_breakdown": recent_breakdown,
        "earliest": str(earliest),
        "alltime_summary": f"Total Income: {fmt(a_income)}\nTotal Expenses: {fmt(a_expenses)}\nNet Profit/Loss: {fmt(a_net)}\nTransactions: {a_count}",
        "monthly_breakdown": monthly_breakdown,
        "transactions": transactions_with_desc,  # raw list for keyword filtering
    }

    return context      # type: ignore


async def get_financial_context(user_id: int, role: str) -> dict:
    """Return cached context or fetch fresh from DB."""
    cached = _context_cache.get(user_id)
    if cached:
        ctx, ts = cached
        if time.time() - ts < CACHE_TTL:
            logger.info(f"Context cache hit for user_id={user_id}")
            return ctx      # type: ignore

    logger.info(f"Context cache miss — fetching from DB for user_id={user_id}")
    ctx = await _fetch_context_from_db(user_id, role)
    _context_cache[user_id] = (ctx, time.time())
    return ctx      # type: ignore  


def _build_context_string(ctx: dict, keywords: list[str]) -> str:
    """
    Option 2: Only include description rows that match the user's keywords.
    Falls back to all rows if no keywords extracted.
    """
    all_txns = ctx["transactions"]

    if keywords:
        matched = [t for t in all_txns if any(kw in t["description"].lower() for kw in keywords)]
        # If keyword search yields nothing, include all (query may be general)
        filtered = matched if matched else all_txns
    else:
        filtered = all_txns

    if filtered:
        desc_lines = "\n".join(
            f"  - [{t['date']}] {t['type']} | {t['category']} | ₱{t['amount']:,.2f} | {t['description']}"
            for t in filtered
        )
        desc_section = f"\n=== INDIVIDUAL TRANSACTIONS WITH DESCRIPTIONS (last 90 days{', keyword-filtered' if keywords and matched else ''}) ===\nFormat: [date] type | category | amount | description\n{desc_lines}"
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


async def chat(
    message: str,
    history: list[dict],
    user_id: int,
    role: str,
) -> str:
    try:
        # Option 3: cached context
        ctx = await get_financial_context(user_id, role)

        # Option 2: keyword-filtered descriptions
        keywords = _extract_keywords(message)
        financial_context = _build_context_string(ctx, keywords)

        system_prompt = f"""You are a financial assistant for TransacScope. You're friendly, casual, and helpful — like a knowledgeable friend who knows their numbers.

RULES:
1. Answer what was asked first, then you can add one short relevant follow-up thought — but never volunteer data the user didn't ask for as the main answer.
2. If the user asks for a specific date range and you have it, answer directly. Give context (e.g. per-month breakdown if they asked for a range), not just a single number.
3. You have access to individual transaction descriptions — use them to answer questions about specific items, merchants, or keywords.
4. If you don't have the data they need, say so briefly and suggest the Reports section.
5. No "great question!", no lectures, no unsolicited advice paragraphs.
6. Use ₱ for all amounts. Keep it conversational — short paragraphs or a clean list, not walls of text.
7. If asked about anything outside of finance or this app, politely say it's out of your scope and redirect.

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
        logger.info(f"AI chat response for user_id={user_id} role={role} | keywords={keywords}")
        return reply  # type: ignore

    except Exception:
        logger.exception("Error getting AI chat response")
        raise