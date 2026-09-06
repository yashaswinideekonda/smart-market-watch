from datetime import datetime

from app.database.session import SessionLocal
from app.models.market_snapshot import MarketSnapshot
from app.services.market_data_service import MarketDataService


def fetch_and_save_snapshot(symbol: str) -> MarketSnapshot:
    market_data_service = MarketDataService()

    data = market_data_service.get_quote(symbol)

    snapshot_timestamp = datetime.fromtimestamp(
        data["timestamp"]
    )

    normalized_symbol = data["symbol"]

    previous_close = (
        float(data["previous_close"])
        if data.get("previous_close")
        else None
    )

    volume = (
        float(data["volume"])
        if data.get("volume")
        else None
    )

    db = SessionLocal()

    try:
        existing_snapshot = (
            db.query(MarketSnapshot)
            .filter(
                MarketSnapshot.symbol == normalized_symbol,
                MarketSnapshot.timestamp == snapshot_timestamp,
            )
            .first()
        )

        if existing_snapshot:
            # Update fields that may have been missing
            # when this snapshot was originally created.
            existing_snapshot.price = float(data["close"])
            existing_snapshot.previous_close = previous_close
            existing_snapshot.volume = volume
            existing_snapshot.source = "twelve_data"
            existing_snapshot.is_stale = False

            db.commit()
            db.refresh(existing_snapshot)

            return existing_snapshot

        snapshot = MarketSnapshot(
            symbol=normalized_symbol,
            price=float(data["close"]),
            previous_close=previous_close,
            volume=volume,
            timestamp=snapshot_timestamp,
            source="twelve_data",
            is_stale=False,
        )

        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)

        return snapshot

    finally:
        db.close()