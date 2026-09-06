from datetime import datetime

from sqlalchemy import DateTime, Float, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class UserStockState(Base):
    __tablename__ = "user_stock_state"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    symbol: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    last_seen_price: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    last_seen_volume: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    last_seen_snapshot_id: Mapped[int | None] = mapped_column(
        ForeignKey("market_snapshots.id"),
        nullable=True,
    )
