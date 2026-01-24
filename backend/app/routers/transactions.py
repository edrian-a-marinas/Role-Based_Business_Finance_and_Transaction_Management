from fastapi import APIRouter
from schemas.transactions import TransactionCreate
from services.transactions_service import create_transaction

router = APIRouter(prefix="/transactions")

@router.post("/")
async def create(tx: TransactionCreate):
    return await create_transaction(tx)
