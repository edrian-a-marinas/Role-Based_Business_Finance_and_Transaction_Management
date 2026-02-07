from fastapi import FastAPI
from routers import transactions, users, reports

app = FastAPI()

app.include_router(transactions.router)
#app.include_router(users.router)
#app.include_router(reports.router)


@app.get("/")
def read_root():
  return {"Hello": "World"}


#uvicorn app.main:app --reload
#http://127.0.0.1:8000/