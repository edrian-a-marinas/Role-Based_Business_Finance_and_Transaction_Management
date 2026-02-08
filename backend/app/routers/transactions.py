from fastapi import APIRouter, HTTPException
from typing import List
from datetime import date

from app.schemas.transactions import (
  TransactionCreate,
  TransactionUpdate,
  TransactionRead
)
from app.services import transactions_service

router = APIRouter(
  prefix="/transactions",
  tags=["transactions"]
)

FAKE_USER_ID = 1


@router.get("/", response_model=List[TransactionRead])
async def list_transactions():
  rows = await transactions_service.get_transactions(FAKE_USER_ID)
  return rows


@router.post("/", response_model=TransactionRead)
async def create_transaction(payload: TransactionCreate):
  row = await transactions_service.create_transaction(
    payload,
    FAKE_USER_ID
  )
  if not row:
    raise HTTPException(status_code=400, detail="Transaction not created")
  return row


@router.put("/{transaction_id}", response_model=TransactionRead)
async def update_transaction(
  transaction_id: int,
  payload: TransactionUpdate
):
  row = await transactions_service.update_transaction(
    transaction_id,
    payload,
    FAKE_USER_ID
  )
  if not row:
    raise HTTPException(status_code=404, detail="Transaction not found")
  return row


@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: int):
  deleted = await transactions_service.delete_transaction(
    transaction_id,
    FAKE_USER_ID
  )
  if not deleted:
    raise HTTPException(status_code=404, detail="Transaction not found")
  return {"status": "deleted"}
