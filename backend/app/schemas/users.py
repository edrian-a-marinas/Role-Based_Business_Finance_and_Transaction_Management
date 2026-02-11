from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# Base user info
class UserBase(BaseModel):
  email: EmailStr
  first_name: str
  middle_name: Optional[str] = None
  last_name: str
  phone_number: str

# Registration
class UserCreate(UserBase):
  password: str

# Reading users
class UserRead(UserBase):
  id: int
  role_id: int
  is_active: bool
  created_at: datetime
  request_admin: bool

# Admin role update
class UserRoleUpdate(BaseModel):
  role_id: int  # 1 = admin, 2 = standard

# Login
class UserLogin(BaseModel):
  email: EmailStr
  password: str

# Request to become admin
class UserAdminRequest(BaseModel):
  request_admin: bool  # True if requesting admin
