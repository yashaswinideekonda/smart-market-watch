from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.watchlists import router as watchlist_router
from app.api.routes.demo import router as demo_router
from app.api.routes.watchlist_management import (
    router as watchlist_management_router,
)
from app.api.routes.stocks import router as stocks_router
from app.routers.auth import router as auth_router

app = FastAPI(
    title="Smart Market Watch API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://smart-market-watch-1.onrender.com",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(watchlist_router)
app.include_router(demo_router)
app.include_router(watchlist_management_router)
app.include_router(stocks_router)
app.include_router(auth_router)




@app.get("/health")
def health_check():
    return {"status": "healthy"}