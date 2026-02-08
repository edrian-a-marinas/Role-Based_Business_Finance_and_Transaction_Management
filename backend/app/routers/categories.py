from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas.categories import CategoryCreate, CategoryRead, CategoryUpdate
from app.services import categories_service

router = APIRouter(
  prefix="/categories",
  tags=["categories"]
)

# TEMP: JWT/Auth logic will decide admin vs standard
FAKE_USER_ID = 1  # Temporary placeholder
FAKE_ADMIN = True  # Temporary placeholder for admin check

def theFunctionCheckingIT(user_id: int):
  if user_id == FAKE_USER_ID:
    return True
  else:
    return False


# GET all
@router.get("/", response_model=List[CategoryRead])
async def list_categories():
  rows = await categories_service.get_categories()
  return rows


# POST (admin only)
@router.post("/", response_model=CategoryRead)
async def create_category(payload: CategoryCreate):
  isadmin = theFunctionCheckingIT

  if isadmin is False:
    raise HTTPException(status_code=403, detail="Only admin can create categories")
  
  row = await categories_service.create_category(payload)
  if not row:
    raise HTTPException(status_code=400, detail="Category not created")
  return row


# PUT (admin only)
@router.put("/{category_id}", response_model=CategoryRead)
async def update_category(category_id: int, payload: CategoryUpdate):
  if not FAKE_ADMIN:
    raise HTTPException(status_code=403, detail="Only admin can update categories")
  row = await categories_service.update_category(
    category_id, payload.name, payload.description
  )
  if not row:
    raise HTTPException(status_code=404, detail="Category not found")
  return row

# DELETE (admin only)
@router.delete("/{category_id}")
async def delete_category(category_id: int):
  if not FAKE_ADMIN:
    raise HTTPException(status_code=403, detail="Only admin can delete categories")
  deleted = await categories_service.delete_category(category_id)
  if not deleted:
    raise HTTPException(status_code=400, detail="Category cannot be deleted (may have transactions)")
  return {"status": "deleted"}
