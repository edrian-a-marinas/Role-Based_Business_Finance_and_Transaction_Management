from fastapi import FastAPI
from app.core.config import configure_middlewares, debug_mode

from app.auth import router_auth as authentications
from app.auth import router_email_verification as email_verification
from app.routers import transactions, categories, reports, users
from tests import test_health

app = FastAPI(**debug_mode())

# Apply middlewares
configure_middlewares(app)

# Auth
app.include_router(authentications.router)
app.include_router(email_verification.router)

# App logic
app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(reports.router)
app.include_router(users.router)

# Health check
app.include_router(test_health.router)