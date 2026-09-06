from app.engines.attention_engine.attention_score import (
    calculate_attention_score,
)
from app.engines.change_engine import (
    calculate_change_since_last_seen,
    calculate_relative_movement,
    calculate_volume_ratio,
    calculate_z_score,
)
from app.models.stock_baseline import StockBaseline


def analyze_stock_change(
    current_price: float,
    previous_close: float | None,
    current_volume: float | None,
    last_seen_price: float | None,
    baseline: StockBaseline | None,
    market_return: float | None = None,
) -> dict:
    # 1. Change since the user last saw the stock
    change = calculate_change_since_last_seen(
        current_price,
        last_seen_price,
    )

    # 2. Today's market return
    daily_return = None

    if previous_close is not None and previous_close > 0:
        daily_return = (
            (current_price - previous_close)
            / previous_close
        ) * 100

    # 3. Unusualness compared with the stock's normal behavior
    z_score = None

    if baseline is not None:
        z_score = calculate_z_score(
            daily_return,
            baseline.avg_return,
            baseline.volatility,
        )

    # 4. Volume anomaly compared with normal volume
    volume_ratio = None

    if baseline is not None:
        volume_ratio = calculate_volume_ratio(
            current_volume,
            baseline.avg_volume,
        )

    # 5. Movement compared with the broader market
    relative_movement = calculate_relative_movement(
        daily_return,
        market_return,
    )

    # 6. Overall attention score
    attention_score = calculate_attention_score(
        change["price_change"],
        z_score,
        volume_ratio,
        relative_movement,
    )

    return {
        "price_change": change["price_change"],
        "price_status": change["status"],
        "daily_return": daily_return,
        "volume_ratio": volume_ratio,
        "z_score": z_score,
        "relative_movement": relative_movement,
        "attention_score": attention_score,
    }