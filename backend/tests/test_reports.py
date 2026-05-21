import pytest
from app.main import app
from app.auth.format_role import get_user_id_and_role
from tests.conftest import make_auth_override


# ── Helpers ───────────────────────────────────────────────────────────────────

def report_payload(
    report_type="monthly",
    start_date="2026-01-01",
    end_date="2026-01-31",
    all_users=False,
):
    return {
        "report_type": report_type,
        "start_date": start_date,
        "end_date": end_date,
        "all_users": all_users,
    }


async def seed_transaction(client, seed_users, amount="100.00", tx_type="Expense", tx_date="2026-01-15"):
    payload = {
        "amount": amount,
        "category_id": seed_users["category_id"],
        "description": "Report test transaction",
        "transaction_date": tx_date,
        "transaction_type": tx_type,
    }
    response = await client.post("/api/transactions/", json=payload)
    return response.json()


# ── SCHEMA VALIDATION ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_report_start_date_after_end_date(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    payload = report_payload(start_date="2026-01-31", end_date="2026-01-01")
    response = await admin_client.post("/api/reports/", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_report_invalid_report_type(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    payload = report_payload(report_type="yearly")
    response = await admin_client.post("/api/reports/", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_report_missing_start_date(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    payload = {"report_type": "monthly", "end_date": "2026-01-31", "all_users": False}
    response = await admin_client.post("/api/reports/", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_report_missing_end_date(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    payload = {"report_type": "monthly", "start_date": "2026-01-01", "all_users": False}
    response = await admin_client.post("/api/reports/", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_report_invalid_transaction_type_query(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    payload = report_payload()
    response = await admin_client.post("/api/reports/?transaction_type=cash", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_report_same_start_and_end_date(admin_client, seed_users):
    """start_date == end_date is valid per the schema validator."""
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    payload = report_payload(start_date="2026-01-15", end_date="2026-01-15")
    response = await admin_client.post("/api/reports/", json=payload)
    assert response.status_code == 200


# ── RESPONSE STRUCTURE ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_report_response_structure(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    payload = report_payload()
    response = await admin_client.post("/api/reports/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "report" in data
    assert "summary" in data
    report = data["report"]
    assert "id" in report
    assert "generated_by" in report
    assert "report_type" in report
    assert "start_date" in report
    assert "end_date" in report
    assert "created_at" in report


@pytest.mark.asyncio
async def test_report_saved_to_history(admin_client, seed_users):
    """generated_by should match the requesting user."""
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    payload = report_payload()
    response = await admin_client.post("/api/reports/", json=payload)
    assert response.status_code == 200
    assert response.json()["report"]["generated_by"] == seed_users["admin_id"]


# ── MONTHLY REPORT ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_monthly_report_returns_summary(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    await seed_transaction(admin_client, seed_users)

    payload = report_payload(report_type="monthly")
    response = await admin_client.post("/api/reports/", json=payload)
    assert response.status_code == 200
    summary = response.json()["summary"]
    assert isinstance(summary, list)
    # Monthly items have no date/week fields
    for item in summary:
        assert "date" not in item or item["date"] is None
        assert "week_start" not in item or item["week_start"] is None


@pytest.mark.asyncio
async def test_monthly_report_summary_fields(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    await seed_transaction(admin_client, seed_users, amount="200.00", tx_type="Expense")

    payload = report_payload(report_type="monthly")
    response = await admin_client.post("/api/reports/", json=payload)
    assert response.status_code == 200
    summary = response.json()["summary"]
    if summary:
        item = summary[0]
        assert "category_name" in item
        assert "total_amount" in item
        assert "transaction_type" in item
        assert "entry_count" in item


# ── DAILY REPORT ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_daily_report_returns_date_field(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    await seed_transaction(admin_client, seed_users, tx_date="2026-01-15")

    payload = report_payload(report_type="daily")
    response = await admin_client.post("/api/reports/", json=payload)
    assert response.status_code == 200
    summary = response.json()["summary"]
    for item in summary:
        assert "date" in item
        assert item["date"] is not None


@pytest.mark.asyncio
async def test_daily_report_date_within_range(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    await seed_transaction(admin_client, seed_users, tx_date="2026-01-10")

    payload = report_payload(report_type="daily", start_date="2026-01-01", end_date="2026-01-31")
    response = await admin_client.post("/api/reports/", json=payload)
    assert response.status_code == 200
    for item in response.json()["summary"]:
        assert "2026-01-01" <= item["date"] <= "2026-01-31"


# ── WEEKLY REPORT ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_weekly_report_returns_week_fields(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    await seed_transaction(admin_client, seed_users, tx_date="2026-01-15")

    payload = report_payload(report_type="weekly")
    response = await admin_client.post("/api/reports/", json=payload)
    assert response.status_code == 200
    summary = response.json()["summary"]
    for item in summary:
        assert "week_start" in item
        assert "week_end" in item
        assert item["week_start"] is not None
        assert item["week_end"] is not None


@pytest.mark.asyncio
async def test_weekly_report_week_start_before_week_end(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    await seed_transaction(admin_client, seed_users, tx_date="2026-01-15")

    payload = report_payload(report_type="weekly")
    response = await admin_client.post("/api/reports/", json=payload)
    assert response.status_code == 200
    for item in response.json()["summary"]:
        assert item["week_start"] <= item["week_end"]


# ── TRANSACTION FILTER ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_filter_expense_only(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    await seed_transaction(admin_client, seed_users, tx_type="Expense")

    payload = report_payload()
    response = await admin_client.post("/api/reports/?transaction_type=expense", json=payload)
    assert response.status_code == 200
    for item in response.json()["summary"]:
        assert item["transaction_type"] == "Expense"


@pytest.mark.asyncio
async def test_filter_income_only(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    await seed_transaction(admin_client, seed_users, tx_type="Income")

    payload = report_payload()
    response = await admin_client.post("/api/reports/?transaction_type=income", json=payload)
    assert response.status_code == 200
    for item in response.json()["summary"]:
        assert item["transaction_type"] == "Income"


@pytest.mark.asyncio
async def test_filter_combined_returns_both_types(admin_client, seed_users):
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    await seed_transaction(admin_client, seed_users, tx_type="Expense")
    await seed_transaction(admin_client, seed_users, tx_type="Income")

    payload = report_payload()
    response = await admin_client.post("/api/reports/?transaction_type=combined", json=payload)
    assert response.status_code == 200
    types = {item["transaction_type"] for item in response.json()["summary"]}
    assert "Expense" in types
    assert "Income" in types


# ── SCOPING: ADMIN ALL_USERS ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_all_users_true_sees_all(admin_client, standard_client, seed_users):
    """Admin with all_users=True should see transactions from all users."""
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["standard_id"], "standard")
    await seed_transaction(standard_client, seed_users, amount="50.00")

    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    await seed_transaction(admin_client, seed_users, amount="75.00")

    payload = report_payload(all_users=True)
    response = await admin_client.post("/api/reports/", json=payload)
    assert response.status_code == 200
    summary = response.json()["summary"]
    total = sum(item["total_amount"] for item in summary if item["transaction_type"] == "Expense")
    assert total >= 125.0  # both users' expenses combined


@pytest.mark.asyncio
async def test_admin_all_users_false_sees_own_only(admin_client, standard_client, seed_users):
    """Admin with all_users=False should see only their own transactions."""
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["standard_id"], "standard")
    await seed_transaction(standard_client, seed_users, amount="999.00")

    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    await seed_transaction(admin_client, seed_users, amount="10.00")

    payload = report_payload(all_users=False)
    response = await admin_client.post("/api/reports/", json=payload)
    assert response.status_code == 200
    summary = response.json()["summary"]
    total = sum(item["total_amount"] for item in summary if item["transaction_type"] == "Expense")
    # Should reflect only admin's 10.00, not standard's 999.00
    assert total < 999.0


@pytest.mark.asyncio
async def test_standard_user_all_users_true_ignored(standard_client, admin_client, seed_users):
    """Standard user requesting all_users=True should still only see their own."""
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    await seed_transaction(admin_client, seed_users, amount="500.00")

    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["standard_id"], "standard")
    await seed_transaction(standard_client, seed_users, amount="20.00")

    payload = report_payload(all_users=True)
    response = await standard_client.post("/api/reports/", json=payload)
    assert response.status_code == 200
    summary = response.json()["summary"]
    total = sum(item["total_amount"] for item in summary if item["transaction_type"] == "Expense")
    # Should only see their own 20.00, not admin's 500.00
    assert total < 500.0


# ── EMPTY RANGE ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_report_empty_summary_for_date_range_with_no_transactions(admin_client, seed_users):
    """A date range with no transactions should return 200 with an empty summary."""
    app.dependency_overrides[get_user_id_and_role] = make_auth_override(seed_users["admin_id"], "admin")
    payload = report_payload(start_date="2000-01-01", end_date="2000-01-31")
    response = await admin_client.post("/api/reports/", json=payload)
    assert response.status_code == 200
    assert response.json()["summary"] == []