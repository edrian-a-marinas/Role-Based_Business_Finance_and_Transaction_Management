from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))

DEBUG = os.getenv("DEBUG", "False").lower() == "true"

ALLOWED_HOSTS = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")]
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

def debug_mode():
  return {
    "debug": DEBUG,
    "docs_url": "/docs" if DEBUG else None,
    "redoc_url": "/redoc" if DEBUG else None,
    "openapi_url": "/openapi.json" if DEBUG else None
  }


def configure_middlewares(app):
  # Trusted host
  app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts= ALLOWED_HOSTS  # replace with your production hosts
  )

  # CORS
  app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # replace with frontend URL
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
    allow_credentials=True
  )
