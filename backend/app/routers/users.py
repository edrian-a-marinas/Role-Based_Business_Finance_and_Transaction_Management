from fastapi import APIRouter, Depends, HTTPException
from typing import List
from schemas.users import UserCreate, UserRead, UserRoleUpdate, UserAdminRequest, UserBase
from app.services import users_service

from security import get_current_user
from app.utils import helpers
from db.connection import get_pool

SUPER_ADMIN_ID = 1

router = APIRouter(prefix="/users", tags=["Users"])



# GET all users (admin only)
@router.get("/", response_model=List[UserRead])
async def list_users(current_user: dict = Depends(get_current_user)):
  if current_user["role_id"] != 1 and current_user["id"] != SUPER_ADMIN_ID:
    raise HTTPException(status_code=403, detail="Admin only")
  return await users_service.get_all_users("admin")

# STANDARD requests admin promotion
@router.post("/request-admin")
async def request_admin_promotion(payload: UserAdminRequest, current_user: dict = Depends(get_current_user)):
  if current_user["role_id"] != 2:
    raise HTTPException(status_code=400, detail="Only standard users can request admin")
  if not payload.request_admin:
    raise HTTPException(status_code=400, detail="Must request admin to proceed")
  await users_service.request_admin(current_user["id"])
  return {"detail": "Request sent to admin"}

# ADMIN approves/rejects admin request (update role)
@router.patch("/{user_id}/role", response_model=UserRead)
async def update_role(user_id: int, payload: UserRoleUpdate, current_user: dict = Depends(get_current_user)):
  current_user_role = "admin" if current_user["role_id"] == 1 else "standard"
  updated_user = await users_service.update_user_role(
    user_id,
    payload.role_id,
    current_user["id"],
    current_user_role
  )
  if not updated_user:
    raise HTTPException(status_code=403, detail="Cannot update role or user not found")
  return updated_user

# SOFT DELETE by admin
@router.delete("/{user_id}/soft")
async def soft_delete(user_id: int, current_user: dict = Depends(get_current_user)):
  if current_user["role_id"] != 1 and current_user["id"] != SUPER_ADMIN_ID:
    raise HTTPException(status_code=403, detail="Admin only")
  success = await users_service.soft_delete_user(user_id, "admin")
  if not success:
    raise HTTPException(status_code=404, detail="User not found")
  return {"detail": "User soft-deleted"}

# HARD DELETE by standard user (self delete)
@router.delete("/me")
async def hard_delete(current_user: dict = Depends(get_current_user)):
  success = await users_service.hard_delete_user(current_user["id"], current_user["id"])
  if not success:
    raise HTTPException(status_code=403, detail="Cannot delete other users")
  return {"detail": "Account permanently deleted"}

# UPDATE own info (standard only, cannot change role)
@router.patch("/me", response_model=UserRead)
async def update_self(payload: UserBase, current_user: dict = Depends(get_current_user)):
  updated_user = await users_service.update_self_info(current_user["id"], payload)
  return updated_user
