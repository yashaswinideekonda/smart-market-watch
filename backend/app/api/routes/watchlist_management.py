from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database.session import SessionLocal
from app.models.watchlist import Watchlist
from app.models.watchlist_stock import WatchlistStock


router = APIRouter(
    prefix="/api/watchlists",
    tags=["Watchlist Management"],
)


class CreateWatchlistRequest(BaseModel):
    name: str


class AddStockRequest(BaseModel):
    symbol: str


@router.get("")
def get_watchlists(user_id: int = 2):
    db = SessionLocal()

    try:
        watchlists = (
            db.query(Watchlist)
            .filter(Watchlist.user_id == user_id)
            .order_by(Watchlist.created_at.asc())
            .all()
        )

        result = []

        for watchlist in watchlists:
            stocks = (
                db.query(WatchlistStock)
                .filter(
                    WatchlistStock.watchlist_id == watchlist.id
                )
                .order_by(WatchlistStock.added_at.asc())
                .all()
            )

            result.append(
                {
                    "id": watchlist.id,
                    "name": watchlist.name,
                    "stocks": [
                        stock.symbol
                        for stock in stocks
                    ],
                    "stock_count": len(stocks),
                }
            )

        return {
            "watchlists": result,
            "count": len(result),
        }

    finally:
        db.close()


@router.post("")
def create_watchlist(
    request: CreateWatchlistRequest,
    user_id: int = 2,
):
    name = request.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Watchlist name cannot be empty",
        )

    db = SessionLocal()

    try:
        watchlist = Watchlist(
            user_id=user_id,
            name=name,
        )

        db.add(watchlist)
        db.commit()
        db.refresh(watchlist)

        return {
            "id": watchlist.id,
            "name": watchlist.name,
            "stocks": [],
            "stock_count": 0,
        }

    finally:
        db.close()


@router.get("/{watchlist_id}")
def get_watchlist(
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
            .order_by(WatchlistStock.added_at.asc())
            .all()
        )

        return {
            "id": watchlist.id,
            "name": watchlist.name,
            "stocks": [
                stock.symbol
                for stock in stocks
            ],
            "stock_count": len(stocks),
        }

    finally:
        db.close()


@router.post("/{watchlist_id}/stocks")
def add_stock(
    watchlist_id: int,
    request: AddStockRequest,
    user_id: int = 2,
):
    symbol = request.symbol.strip().upper()

    if not symbol:
        raise HTTPException(
            status_code=400,
            detail="Stock symbol cannot be empty",
        )

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

        existing_stock = (
            db.query(WatchlistStock)
            .filter(
                WatchlistStock.watchlist_id == watchlist_id,
                WatchlistStock.symbol == symbol,
            )
            .first()
        )

        if existing_stock is not None:
            raise HTTPException(
                status_code=409,
                detail=f"{symbol} is already in this watchlist",
            )

        stock = WatchlistStock(
            watchlist_id=watchlist_id,
            symbol=symbol,
        )

        db.add(stock)
        db.commit()
        db.refresh(stock)

        return {
            "message": f"{symbol} added to watchlist",
            "symbol": symbol,
            "watchlist_id": watchlist_id,
        }

    finally:
        db.close()


@router.delete("/{watchlist_id}/stocks/{symbol}")
def remove_stock(
    watchlist_id: int,
    symbol: str,
    user_id: int = 2,
):
    symbol = symbol.strip().upper()

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

        stock = (
            db.query(WatchlistStock)
            .filter(
                WatchlistStock.watchlist_id == watchlist_id,
                WatchlistStock.symbol == symbol,
            )
            .first()
        )

        if stock is None:
            raise HTTPException(
                status_code=404,
                detail=f"{symbol} is not in this watchlist",
            )

        db.delete(stock)
        db.commit()

        return {
            "message": f"{symbol} removed from watchlist",
            "symbol": symbol,
            "watchlist_id": watchlist_id,
        }

    finally:
        db.close()