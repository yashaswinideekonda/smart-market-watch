import statistics
from datetime import datetime

from app.database.session import SessionLocal
from app.models.stock_baseline import StockBaseline
from app.services.market_data_service import MarketDataService


def get_stock_baseline(symbol: str) -> StockBaseline | None:
    db = SessionLocal()

    try:
        return (
            db.query(StockBaseline)
            .filter(StockBaseline.symbol == symbol)
            .first()
        )
    finally:
        db.close()


def calculate_historical_baseline(
    symbol: str,
    outputsize: int = 30,
) -> StockBaseline:
    market_data_service = MarketDataService()

    data = market_data_service.get_historical_data(
        symbol=symbol,
        interval="1day",
        outputsize=outputsize,
    )

    values = data.get("values", [])

    if len(values) < 2:
        raise ValueError(
            "Not enough historical data to calculate baseline."
        )

    # Twelve Data returns newest data first.
    # Reverse it so calculations move from oldest to newest.
    values = list(reversed(values))

    prices = [
        float(item["close"])
        for item in values
    ]

    volumes = [
        float(item["volume"])
        for item in values
        if item.get("volume")
    ]

    # Calculate daily percentage returns.
    returns = []

    for previous_price, current_price in zip(
        prices,
        prices[1:],
    ):
        daily_return = (
            (current_price - previous_price)
            / previous_price
        ) * 100

        returns.append(daily_return)

    average_return = statistics.mean(returns)

    volatility = (
        statistics.stdev(returns)
        if len(returns) > 1
        else 0.0
    )

    average_volume = (
        statistics.mean(volumes)
        if volumes
        else None
    )

    sample_size = len(returns)

    db = SessionLocal()

    try:
        baseline = (
            db.query(StockBaseline)
            .filter(StockBaseline.symbol == data["meta"]["symbol"])
            .first()
        )

        if baseline is None:
            baseline = StockBaseline(
                symbol=data["meta"]["symbol"],
                avg_return=average_return,
                volatility=volatility,
                avg_volume=average_volume,
                sample_size=sample_size,
                calculated_at=datetime.utcnow(),
            )

            db.add(baseline)

        else:
            baseline.avg_return = average_return
            baseline.volatility = volatility
            baseline.avg_volume = average_volume
            baseline.sample_size = sample_size
            baseline.calculated_at = datetime.utcnow()

        db.commit()
        db.refresh(baseline)

        return baseline

    finally:
        db.close()