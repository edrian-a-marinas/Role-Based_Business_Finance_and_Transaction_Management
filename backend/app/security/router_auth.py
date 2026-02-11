from fastapi import APIRouter, Depends, HTTPException
from schemas.users import UserCreate, UserRead, UserLogin
# from services import users_service  # import your service later
# from utils import helpers           # import hash_password, verify_password

router = APIRouter(prefix="/auth")

# REGISTER: standard user only, role_id defaults to 2
@router.post("/register", response_model=UserRead)
async def register_user(user: UserCreate):
  """
  Endpoint for standard user registration.
  """
  pass  # implementation later


# LOGIN: standard/admin user
@router.post("/login")
async def login_user(payload: UserLogin):
  """
  Endpoint for user login, returns JWT if valid.
  """
  pass  # implementation later


# OPTIONAL: logout, refresh token, etc.
@router.post("/logout")
async def logout_user():
  """
  Endpoint to invalidate token / clear session.
  """
  pass
