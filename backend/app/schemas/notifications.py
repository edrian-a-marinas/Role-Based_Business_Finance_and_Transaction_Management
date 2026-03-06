from pydantic import BaseModel
from datetime import datetime
from typing import Any


class NotificationRead(BaseModel):
  id: int
  recipient_user_id: int
  type: str
  payload: dict[str, Any]
  is_read: bool
  created_at: datetime

  class Config:
    from_attributes = True


class NotificationUnreadCount(BaseModel):
  unread_count: int