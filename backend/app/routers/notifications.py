from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
from typing import List, Tuple
from app.auth.security import decode_access_token
from app.auth.format_role import get_user_id_and_role
from app.services import notifications_service
from app.schemas.notifications import NotificationRead, NotificationUnreadCount
import asyncio, json

router = APIRouter(prefix="/api/notifications")

_connections: dict[int, list[asyncio.Queue]] = {}

async def push_to_user(user_id: int, data: dict):
  for queue in _connections.get(user_id, []):
    await queue.put(data)

@router.get("/stream")
async def notification_stream(
  token: str = Query(...),
  token_type: str = Query(...),
):
  payload = decode_access_token(token)
  user_id = payload.get("user_id")
  if not user_id:
    raise HTTPException(status_code=401, detail="Invalid token")
  queue = asyncio.Queue()
  _connections.setdefault(user_id, []).append(queue)
  async def event_generator():
    try:
      while True:
        data = await queue.get()
        yield f"data: {json.dumps(data)}\n\n"
    except asyncio.CancelledError:
      pass
    finally:
      _connections[user_id].remove(queue)
      if not _connections[user_id]:
        del _connections[user_id]
  return StreamingResponse(
    event_generator(),
    media_type="text/event-stream",
    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
  )

@router.get("/", response_model=List[NotificationRead])
async def get_notifications(user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  CURRENT_USER_ID, _ = user_data
  return await notifications_service.get_notifications(CURRENT_USER_ID)

@router.get("/unread-count", response_model=NotificationUnreadCount)
async def get_unread_count(user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
  CURRENT_USER_ID, _ = user_data
  count = await notifications_service.get_unread_count(CURRENT_USER_ID)
  return {"unread_count": count}

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