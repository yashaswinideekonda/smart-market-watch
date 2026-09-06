from app.database.base import Base
from app.database.session import engine

# Import models so SQLAlchemy registers all tables.
from app.models import (  # noqa: F401
    MarketSnapshot,
    User,
    UserStockState,
    Watchlist,
    WatchlistStock,
)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
    print("Database tables created successfully.")
