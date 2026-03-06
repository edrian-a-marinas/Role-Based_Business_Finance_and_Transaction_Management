from fastapi import APIRouter, HTTPException, Depends
from typing import List, Tuple
from app.auth.format_role import get_user_id_and_role
from app.services import notifications_service
from app.schemas.notifications import NotificationRead, NotificationUnreadCount

router = APIRouter(prefix="/api/notifications")


@router.get("/", response_model=List[NotificationRead])
async def get_notifications(user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  CURRENT_USER_ID, _ = user_data
  return await notifications_service.get_notifications(CURRENT_USER_ID)


@router.get("/unread-count", response_model=NotificationUnreadCount)
async def get_unread_count(user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  CURRENT_USER_ID, _ = user_data
  count = await notifications_service.get_unread_count(CURRENT_USER_ID)
  return {"unread_count": count}


# /read-all must be above /{notification_id}/read to avoid route shadowing
@router.patch("/read-all")
async def mark_all_as_read(user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  CURRENT_USER_ID, _ = user_data
  updated = await notifications_service.mark_all_as_read(CURRENT_USER_ID)
  return {"detail": f"{updated} notification(s) marked as read"}


@router.patch("/{notification_id}/read")
async def mark_as_read(notification_id: int, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  CURRENT_USER_ID, _ = user_data
  success = await notifications_service.mark_as_read(notification_id, CURRENT_USER_ID)
  if not success:
    raise HTTPException(status_code=404, detail="Notification not found")
  return {"detail": "Marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: int, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  CURRENT_USER_ID, _ = user_data
  success = await notifications_service.delete_notification(notification_id, CURRENT_USER_ID)
  if not success:
    raise HTTPException(status_code=404, detail="Notification not found")
  return {"detail": "Deleted"}