from fastapi import FastAPI

from app.auth import router_auth as authentications
from app.routers import (
  transactions, 
  categories, 
  reports,
  users,
  )

app = FastAPI()

# 1. Backend API Routings (Returns JSON)
app.include_router(authentications.router)

app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(reports.router)
app.include_router(users.router)
