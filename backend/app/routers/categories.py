from fastapi import APIRouter, HTTPException
from typing import List
from app.services import categories_service

from app.schemas.categories import (
  CategoryCreate, 
  CategoryRead, 
  CategoryUpdate
)

from routers import transactions


# TEMPORARY

router = APIRouter(
  prefix="/categories",
  tags=["categories"]
)



# GET all
@router.get("/", response_model=List[CategoryRead])
async def list_categories():
  rows = await categories_service.get_categories()
  return rows


# POST (admin only)
@router.post("/", response_model=CategoryRead)
async def create_category(payload: CategoryCreate):

  current_user_id = await transactions.get_logged_in_user_id()
  role = await transactions.get_user_role(current_user_id)
  
  row = await categories_service.create_category(payload, role)
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
