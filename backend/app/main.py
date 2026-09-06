from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.watchlists import router as watchlist_router


app = FastAPI(
    title="Smart Market Watch API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(watchlist_router)


@app.get("/health")
def health_check():
    return {"status": "healthy"}