from datetime import datetime

from sqlalchemy import DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class StockBaseline(Base):
    __tablename__ = "stock_baselines"

    symbol: Mapped[str] = mapped_column(
        String(50),
        primary_key=True,
    )

    avg_return: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    volatility: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    avg_volume: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    sample_size: Mapped[int] = mapped_column(
        default=0,
        nullable=False,
    )

    calculated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )