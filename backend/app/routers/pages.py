"""
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

#router = APIRouter
#templates = (directory="") # Folders where your .html files live


#MAKE SURE IS AUTH FIRST BEFORE LOGGIN IN, this is the home page
@router.get("/", response_class=HTMLResponse)
async def home_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

#
@router.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})





USE REACT AND VUE or VITE
possible setup for frontend
Project_Root/
├── backend/ (FastAPI)
│   ├── app/
│   │   ├── routers/ (transactions.py, users.py - RETURNS JSON ONLY)
│   │   └── main.py
├── frontend/ (React or Vue)
│   ├── src/
│   │   ├── components/ (Sidebar.jsx, TransactionTable.jsx)
│   │   ├── pages/ (Dashboard.jsx, Login.jsx)
│   │   └── App.jsx (This handles the "Routing" between pages)
│   ├── public/
│   │   └── index.html (The "Shell")
│   └── package.json






    
"""
