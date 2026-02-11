from fastapi import FastAPI

from app.security import router_auth as authentications
from app.routers import (
  transactions, 
  categories, 
  reports,
  users,
  pages
  )

app = FastAPI()


# 1. Mount Static Files (CSS, JS, Images)
# This makes files in /static accessible via ://yourdomain.com
# app.mount("/static", StaticFiles(directory="static"), name="static")

# 2. Backend API Routings (Returns JSON)
app.include_router(authentications.router)

app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(reports.router)
app.include_router(users.router)


# 3. Frontend Page Routings (Returns HTML)
# app.include_router(pages.router)





