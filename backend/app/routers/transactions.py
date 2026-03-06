from fastapi import APIRouter, HTTPException, Depends
from typing import List, Tuple
from app.auth.format_role import get_user_id_and_role
from app.services import transactions_service
from app.schemas.transactions import (
  TransactionCreate,
  TransactionUpdate,
  TransactionRead,
  TransactionHistoryRead,
  TransactionDeletionRequestCreate,
  TransactionDeletionRequestRead,
  ReviewDeletionRequestPayload,
  DeletionRequestHistoryRead,
)

router = APIRouter(prefix="/api/transactions")


@router.get("/history", response_model=List[TransactionHistoryRead])
async def get_transaction_history(user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  CURRENT_USER_ID, role = user_data
  return await transactions_service.get_transaction_history(CURRENT_USER_ID, role)


@router.get("/count-by-category/{category_id}")
async def count_transactions_by_category(category_id: int, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  CURRENT_USER_ID, role = user_data
  count = await transactions_service.count_transactions_by_category(category_id, CURRENT_USER_ID, role)
  return {"count": count}


# All /deletion-requests/* static routes must come before /{transaction_id}
@router.get("/deletion-requests/my-history", response_model=List[DeletionRequestHistoryRead])
async def get_my_deletion_request_history(user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  CURRENT_USER_ID, role = user_data
  return await transactions_service.get_deletion_requests_my_history(current_user_id=CURRENT_USER_ID, role=role)


@router.get("/deletion-requests", response_model=List[TransactionDeletionRequestRead])
async def get_deletion_requests(user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  CURRENT_USER_ID, role = user_data
  if role != "admin" and role != 1:
    raise HTTPException(status_code=403, detail="Not authorized")
  return await transactions_service.get_deletion_requests()


@router.post("/request-deletion", response_model=TransactionDeletionRequestRead)
async def request_transaction_deletion(
  payload: TransactionDeletionRequestCreate,
  user_data: Tuple[int, str] = Depends(get_user_id_and_role),
):
  CURRENT_USER_ID, role = user_data
  if role == "admin" or role == 1:
    raise HTTPException(status_code=403, detail="Admins cannot request deletion")
  row = await transactions_service.create_transaction_deletion_request(payload.transaction_id, CURRENT_USER_ID)
  if not row:
    raise HTTPException(status_code=400, detail="Pending deletion request already exists")
  return row


@router.patch("/deletion-requests/{request_id}")
async def review_deletion_request(
  request_id: int,
  payload: ReviewDeletionRequestPayload,
  user_data: Tuple[int, str] = Depends(get_user_id_and_role),
):
  CURRENT_USER_ID, role = user_data
  if role != "admin" and role != 1:
    raise HTTPException(status_code=403, detail="Not authorized")
  row = await transactions_service.review_deletion_request(request_id, CURRENT_USER_ID, payload.approve)
  if not row:
    raise HTTPException(status_code=404, detail="Request not found or already reviewed")
  return row


@router.delete("/deletion-requests/{request_id}")
async def cancel_deletion_request(
  request_id: int,
  user_data: Tuple[int, str] = Depends(get_user_id_and_role),
):
  CURRENT_USER_ID, role = user_data
  result = await transactions_service.cancel_deletion_request(request_id, CURRENT_USER_ID)
  if not result:
    raise HTTPException(status_code=404, detail="Request not found or already reviewed.")
  return {"detail": "Request cancelled."}


@router.get("/", response_model=List[TransactionRead])
async def get_transactions(user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  CURRENT_USER_ID, role = user_data
  return await transactions_service.get_transactions(CURRENT_USER_ID, role)


@router.post("/", response_model=TransactionRead)
async def create_transaction(payload: TransactionCreate, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  CURRENT_USER_ID, role = user_data
  row = await transactions_service.create_transaction(payload, CURRENT_USER_ID)
  if not row:
    raise HTTPException(status_code=400, detail="Transaction not created")
  return row


@router.get("/{transaction_id}", response_model=TransactionRead)
async def get_transaction_by_id(transaction_id: int, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  CURRENT_USER_ID, role = user_data
  row = await transactions_service.get_transaction_by_id(transaction_id, CURRENT_USER_ID, role)
  if not row:
    raise HTTPException(status_code=404, detail="Transaction not found")
  return row


@router.put("/{transaction_id}", response_model=TransactionRead)
async def update_transaction(transaction_id: int, payload: TransactionUpdate, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  CURRENT_USER_ID, role = user_data
  row = await transactions_service.update_transaction(transaction_id, payload, CURRENT_USER_ID, role)
  if not row:
    raise HTTPException(status_code=404, detail="Transaction not found or not allowed to edit")
  return row


@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: int, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  CURRENT_USER_ID, role = user_data
  deleted = await transactions_service.delete_transaction(transaction_id, CURRENT_USER_ID, role)
  if not deleted:
    raise HTTPException(status_code=404, detail="Transaction not found or not allowed to delete")
  return {"status": "deleted"}