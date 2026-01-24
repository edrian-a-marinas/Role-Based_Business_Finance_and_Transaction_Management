from fastapi import FastAPI
from routers import transactions, users, reports

app = FastAPI()

app.include_router(transactions.router)
app.include_router(users.router)
app.include_router(reports.router)



#uvicorn app.main:app --reload