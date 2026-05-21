# app/schemas/ai.py
from pydantic import BaseModel
from typing import Literal, Optional


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    scope: Optional[Literal["all", "own"]] = "all"  # admins only; ignored for standard users


class ChatResponse(BaseModel):
    reply: str