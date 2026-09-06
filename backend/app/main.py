from fastapi import FastAPI

from app.api.routes.watchlists import router as watchlist_router


app = FastAPI(
    title="Smart Market Watch API",
    version="1.0.0",
)


app.include_router(watchlist_router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }