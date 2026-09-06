from fastapi import APIRouter, HTTPException

from app.database.session import SessionLocal
from app.models.watchlist import Watchlist
from app.models.watchlist_stock import WatchlistStock
from app.services.baseline_service import get_stock_baseline
from app.services.change_analysis_service import analyze_stock_change
from app.services.market_snapshot_service import fetch_and_save_snapshot
from app.services.user_state_service import get_user_stock_state, mark_stock_seen


router = APIRouter(
    prefix="/api/watchlists",
    tags=["Watchlists"],
)


@router.get("/{watchlist_id}/changes")
def get_watchlist_changes(
    watchlist_id: int,
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

    finally:
        db.close()

    results = []

    for stock in stocks:
        symbol = stock.symbol

        try:
            snapshot = fetch_and_save_snapshot(
                f"{symbol}:NSE"
            )

            user_state = get_user_stock_state(
                user_id,
                symbol,
            )

            baseline = get_stock_baseline(symbol)

            analysis = analyze_stock_change(
                current_price=snapshot.price,
                previous_close=snapshot.previous_close,
                current_volume=snapshot.volume,
                last_seen_price=(
                    user_state.last_seen_price
                    if user_state
                    else None
                ),
                baseline=baseline,
            )

            results.append(
                {
                    "symbol": symbol,
                    "current_price": snapshot.price,
                    "previous_close": snapshot.previous_close,
                    "volume": snapshot.volume,
                    "last_seen_at": (
                        user_state.last_seen_at
                        if user_state
                        else None
                    ),
                    **analysis,
                }
            )

        except Exception as exc:
            results.append(
                {
                    "symbol": symbol,
                    "error": str(exc),
                }
            )

    results.sort(
        key=lambda item: item.get(
            "attention_score",
            0,
        ),
        reverse=True,
    )

    return {
        "watchlist_id": watchlist_id,
        "watchlist_name": watchlist.name,
        "stocks": results,
        "count": len(results),
    }
@router.post("/{watchlist_id}/mark-seen")
def mark_watchlist_seen(watchlist_id: int, user_id: int = 2):
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
            .filter(WatchlistStock.watchlist_id == watchlist_id)
            .all()
        )

    finally:
        db.close()

    marked_stocks = []

    for stock in stocks:
        symbol = stock.symbol

        try:
            snapshot = fetch_and_save_snapshot(f"{symbol}:NSE")

            state = mark_stock_seen(
                user_id=user_id,
                symbol=symbol,
                price=snapshot.price,
                volume=snapshot.volume,
                snapshot_id=snapshot.id,
            )

            marked_stocks.append(
                {
                    "symbol": symbol,
                    "price": state.last_seen_price,
                    "volume": state.last_seen_volume,
                    "last_seen_at": state.last_seen_at,
                    "snapshot_id": state.last_seen_snapshot_id,
                }
            )

        except Exception as exc:
            marked_stocks.append(
                {
                    "symbol": symbol,
                    "error": str(exc),
                }
            )

    return {
        "watchlist_id": watchlist_id,
        "message": "Watchlist marked as seen",
        "stocks": marked_stocks,
    }