from datetime import datetime
from fastapi import APIRouter, HTTPException

from app.database.session import SessionLocal
from app.models.market_snapshot import MarketSnapshot
from app.models.watchlist import Watchlist
from app.models.watchlist_stock import WatchlistStock
from app.services.baseline_service import get_stock_baseline
from app.services.change_analysis_service import analyze_stock_change
from app.services.explanation_service import generate_change_explanation
from app.services.market_snapshot_service import fetch_and_save_snapshot
from app.services.user_state_service import (
    get_user_stock_state,
    mark_stock_seen,
)


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
            # Check whether a demo snapshot exists.
            demo_db = SessionLocal()

            try:
                demo_snapshot = (
                    demo_db.query(MarketSnapshot)
                    .filter(
                        MarketSnapshot.symbol.in_([symbol, f"{symbol}:NSE"]),
                        MarketSnapshot.source == "demo",
                    )
                    .order_by(
                        MarketSnapshot.timestamp.desc()
                    )
                    .first()
                )
            finally:
                demo_db.close()

            if demo_snapshot is None:
                raise RuntimeError(
                    "No demo snapshot available. Click Simulate Change first."
                )

            snapshot = demo_snapshot

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

            explanation = generate_change_explanation(
                price_change=analysis["price_change"],
                z_score=analysis["z_score"],
                volume_ratio=analysis["volume_ratio"],
                attention_score=analysis["attention_score"],
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
                    "explanation": explanation,
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

    meaningful_changes = [
        item
        for item in results
        if item.get("attention_score", 0) >= 30
    ]

    if len(meaningful_changes) == 0:
        summary_message = (
            "You're all caught up. Nothing meaningful changed "
            "since your last visit."
        )

    elif len(meaningful_changes) == 1:
        summary_message = "1 thing deserves your attention."

    else:
        summary_message = (
            f"{len(meaningful_changes)} things deserve "
            "your attention."
        )

    return {
        "watchlist_id": watchlist_id,
        "watchlist_name": watchlist.name,
        "summary": {
            "meaningful_changes": len(meaningful_changes),
            "message": summary_message,
        },
        "stocks": results,
        "count": len(results),
    }


@router.post("/{watchlist_id}/mark-seen")
def mark_watchlist_seen(
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

    marked_stocks = []

    for stock in stocks:
        symbol = stock.symbol

        try:
            try:
                snapshot = fetch_and_save_snapshot(
                    f"{symbol}:NSE"
                )
            except Exception:
                snapshot = MarketSnapshot(
                    symbol=symbol,
                    price=1000.0,
                    previous_close=1000.0,
                    volume=1000000.0,
                    timestamp=datetime.utcnow(),
                    source="demo",
                    is_stale=True,
                )
                db = SessionLocal()
                try:
                    db.add(snapshot)
                    db.commit()
                    db.refresh(snapshot)
                finally:
                    db.close()

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
