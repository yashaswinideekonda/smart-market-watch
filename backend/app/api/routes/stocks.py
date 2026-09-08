from fastapi import APIRouter, HTTPException

from app.database.session import SessionLocal
from app.models.market_snapshot import MarketSnapshot
from app.models.stock_baseline import StockBaseline
from app.models.watchlist_stock import WatchlistStock
from app.services.market_snapshot_service import fetch_and_save_snapshot
from app.services.user_state_service import get_user_stock_state
from app.services.change_analysis_service import analyze_stock_change
from app.services.explanation_service import generate_change_explanation
from app.services.market_data_service import MarketDataService

router = APIRouter(
    prefix="/api/stocks",
    tags=["Stocks"],
)


@router.get("/{symbol}")
def get_stock_details(
    symbol: str,
    user_id: int = 2,
):

    symbol = symbol.strip().upper()

    if not symbol:
        raise HTTPException(
            status_code=400,
            detail="Stock symbol cannot be empty",
        )

    db = SessionLocal()

    try:
        # --------------------------------------------------
        # 1. Check that the stock exists in a watchlist
        # --------------------------------------------------
        watchlist_stock = (
            db.query(WatchlistStock)
            .filter(
                WatchlistStock.symbol == symbol
            )
            .first()
        )

        if watchlist_stock is None:
            raise HTTPException(
                status_code=404,
                detail=f"{symbol} is not in a watchlist",
            )

        provider_symbol = f"{symbol}:NSE"

        # --------------------------------------------------
        # 2. Look for the latest DEMO snapshot
        #
        # Demo snapshots may be stored as either:
        #   INFY
        # or
        #   INFY:NSE
        #
        # The dashboard already uses the demo snapshot,
        # so Stock Details must use the same one.
        # --------------------------------------------------
        demo_snapshot = (
            db.query(MarketSnapshot)
            .filter(
                MarketSnapshot.symbol.in_(
                    [symbol, provider_symbol]
                ),
                MarketSnapshot.source == "demo",
            )
            .order_by(
                MarketSnapshot.timestamp.desc()
            )
            .first()
        )

        # --------------------------------------------------
        # 3. Try real market data first
        #    Fall back to demo data if unavailable
        # --------------------------------------------------
        try:
            snapshot = fetch_and_save_snapshot(
                provider_symbol
            )
        except Exception:
            if demo_snapshot is None:
                raise

            snapshot = demo_snapshot

        # --------------------------------------------------
        # 4. Get the user's last-seen state
        # --------------------------------------------------
        state = get_user_stock_state(
            user_id=user_id,
            symbol=symbol,
        )

        # --------------------------------------------------
        # 5. Get historical baseline
        # --------------------------------------------------
        baseline = (
    db.query(StockBaseline)
    .filter(
        StockBaseline.symbol.in_(
            [symbol, provider_symbol]
        )
    )
    .first()
)

        # --------------------------------------------------
        # 6. Analyze the change
        # --------------------------------------------------
        analysis = analyze_stock_change(
            current_price=snapshot.price,
            previous_close=snapshot.previous_close,
            current_volume=snapshot.volume,
            last_seen_price=(
                state.last_seen_price
                if state is not None
                else None
            ),
            baseline=baseline,
            market_return=None,
        )

        # --------------------------------------------------
        # 7. Generate explanation
        # --------------------------------------------------
        explanation = generate_change_explanation(
            price_change=analysis["price_change"],
            z_score=analysis["z_score"],
            volume_ratio=analysis["volume_ratio"],
            attention_score=analysis["attention_score"],
        )

        # --------------------------------------------------
        # 8. Return details
        # --------------------------------------------------
        return {
            "symbol": symbol,
            "current_price": snapshot.price,
            "previous_close": snapshot.previous_close,
            "volume": snapshot.volume,
            "timestamp": snapshot.timestamp,
            "is_stale": snapshot.is_stale,
            "source": snapshot.source,

            "last_seen_at": (
                state.last_seen_at
                if state is not None
                else None
            ),

            "price_change": analysis[
                "price_change"
            ],

            "price_status": analysis[
                "price_status"
            ],

            "daily_return": analysis[
                "daily_return"
            ],

            "volume_ratio": analysis[
                "volume_ratio"
            ],

            "z_score": analysis[
                "z_score"
            ],

            "relative_movement": analysis[
                "relative_movement"
            ],

            "attention_score": analysis[
                "attention_score"
            ],
            "attention_breakdown": analysis["attention_breakdown"],

            "explanation": explanation,
        }

    finally:
        db.close()

@router.get("/{symbol}/history")
def get_stock_history(
    symbol: str,
    interval: str = "1day",
    outputsize: int = 30,
):
    symbol = symbol.strip().upper()

    if not symbol:
        raise HTTPException(
            status_code=400,
            detail="Stock symbol cannot be empty",
        )

    provider_symbol = f"{symbol}:NSE"

    try:
        market_data_service = MarketDataService()

        data = market_data_service.get_historical_data(
            symbol=provider_symbol,
            interval=interval,
            outputsize=outputsize,
        )

        values = data.get("values", [])

        history = []

        for item in reversed(values):
            history.append(
                {
                    "datetime": item.get("datetime"),
                    "open": float(item["open"]),
                    "high": float(item["high"]),
                    "low": float(item["low"]),
                    "close": float(item["close"]),
                    "volume": (
                        float(item["volume"])
                        if item.get("volume")
                        else None
                    ),
                }
            )

            return {
            "symbol": symbol,
            "interval": interval,
            "history": history,
        }

    except Exception as exc:
        # Graceful fallback when the market-data provider
        # is temporarily unavailable or rate-limited.
        return {
            "symbol": symbol,
            "interval": interval,
            "history": [],
            "data_status": "unavailable",
            "message": "Historical data is temporarily unavailable.",
        }
