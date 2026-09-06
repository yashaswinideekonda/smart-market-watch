from datetime import datetime

from app.database.session import SessionLocal
from app.models.user_stock_state import UserStockState


def get_user_stock_state(
    user_id: int,
    symbol: str,
) -> UserStockState | None:
    db = SessionLocal()

    try:
        return (
            db.query(UserStockState)
            .filter(
                UserStockState.user_id == user_id,
                UserStockState.symbol == symbol,
            )
            .first()
        )
    finally:
        db.close()


def mark_stock_seen(
    user_id: int,
    symbol: str,
    price: float,
    volume: float | None,
    snapshot_id: int,
) -> UserStockState:
    db = SessionLocal()

    try:
        state = (
            db.query(UserStockState)
            .filter(
                UserStockState.user_id == user_id,
                UserStockState.symbol == symbol,
            )
            .first()
        )

        if state is None:
            state = UserStockState(
                user_id=user_id,
                symbol=symbol,
            )
            db.add(state)

        state.last_seen_price = price
        state.last_seen_volume = volume
        state.last_seen_at = datetime.utcnow()
        state.last_seen_snapshot_id = snapshot_id

        db.commit()
        db.refresh(state)

        return state

    finally:
        db.close()