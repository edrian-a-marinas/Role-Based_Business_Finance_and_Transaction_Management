from fastapi import APIRouter, HTTPException, Depends, Query, Request
from app.core.limiter import limiter

from typing import Tuple
from app.auth.format_role import get_user_id_and_role
from app.services import reports_service
from app.schemas.reports import ReportCreate, ReportResult

router = APIRouter(prefix="/api/reports")


@router.post("/", response_model=ReportResult)
@limiter.limit("10/minute")
async def generate_report(
  request: Request,
  payload: ReportCreate,
  transaction_type: str = Query("combined", enum=["income", "expense", "combined"]),
  user_data: Tuple[int, str] = Depends(get_user_id_and_role)
):
  CURRENT_USER_ID, role = user_data
  result = await reports_service.generate_report(payload, CURRENT_USER_ID, role, transaction_filter=transaction_type)
  if not result:
    raise HTTPException(status_code=400, detail="Report generation failed")
  return result