from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.database.session import SessionLocal
from app.models.watchlist import Watchlist
from app.models.watchlist_stock import WatchlistStock
from app.models.market_snapshot import MarketSnapshot


router = APIRouter(
    prefix="/api/demo",
    tags=["Demo"],
)


@router.post("/watchlists/{watchlist_id}/simulate-change")
def simulate_market_change(
    watchlist_id: int,
    price: float = 1080.0,
    user_id: int = 2,
):
    db = SessionLocal()

    try:
        watchlist = (
            db.query(Watchlist)
            .filter(
                Watchlist.id == watchlist_id,
                Watchlist.user_id == user_id,
            )
            .first()
        )

        if watchlist is None:
            raise HTTPException(
                status_code=404,
                detail="Watchlist not found",
            )

        stocks = (
            db.query(WatchlistStock)
            .filter(
                WatchlistStock.watchlist_id == watchlist_id
            )
            .all()
        )

        if not stocks:
            raise HTTPException(
                status_code=400,
                detail="Watchlist has no stocks",
            )

        simulated_stocks = []

        for stock in stocks:
            latest_snapshot = (
                db.query(MarketSnapshot)
                .filter(
                    MarketSnapshot.symbol == stock.symbol
                )
                .order_by(
                    MarketSnapshot.timestamp.desc()
                )
                .first()
            )

            if latest_snapshot is None:
                continue

            simulated_snapshot = MarketSnapshot(
                symbol=latest_snapshot.symbol,
                price=price,
                previous_close=latest_snapshot.previous_close,
                volume=latest_snapshot.volume,
                timestamp=datetime.utcnow(),
                source="demo",
                is_stale=False,
            )

            db.add(simulated_snapshot)

            simulated_stocks.append(
                {
                    "symbol": stock.symbol,
                    "old_price": latest_snapshot.price,
                    "new_price": price,
                }
            )

        db.commit()

        return {
            "watchlist_id": watchlist_id,
            "message": "Demo market change created",
            "stocks": simulated_stocks,
        }

    finally:
        db.close()