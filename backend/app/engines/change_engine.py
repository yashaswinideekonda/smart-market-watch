def calculate_price_change(
    current_price: float,
    last_seen_price: float | None,
) -> float | None:
    """
    Calculate percentage price change since the user's last observation.

    Returns None when there is no previous observation.
    """

    if last_seen_price is None or last_seen_price == 0:
        return None

    return ((current_price - last_seen_price) / last_seen_price) * 100


def classify_price_change(
    price_change: float | None,
) -> str:
    """
    Classify the movement into a simple attention level.
    """

    if price_change is None:
        return "BASELINE"

    absolute_change = abs(price_change)

    if absolute_change < 1:
        return "NORMAL"
    elif absolute_change < 3:
        return "MODERATE"
    elif absolute_change < 5:
        return "HIGH"
    else:
        return "VERY_HIGH"
def calculate_volume_ratio(
    current_volume: float | None,
    average_volume: float | None,
) -> float | None:
    """
    Calculate how current volume compares with average volume.
    """

    if current_volume is None or average_volume is None:
        return None

    if average_volume <= 0:
        return None

    return current_volume / average_volume


def classify_volume_anomaly(
    volume_ratio: float | None,
) -> str:
    """
    Classify unusual trading volume.
    """

    if volume_ratio is None:
        return "UNKNOWN"

    if volume_ratio < 1.2:
        return "NORMAL"
    elif volume_ratio < 2:
        return "ELEVATED"
    elif volume_ratio < 3:
        return "HIGH"
    else:
        return "VERY_HIGH"
def calculate_z_score(
    current_return: float | None,
    average_return: float | None,
    volatility: float | None,
) -> float | None:
    """
    Measure how unusual the current return is
    compared with the stock's normal behavior.
    """

    if (
        current_return is None
        or average_return is None
        or volatility is None
    ):
        return None

    if volatility <= 0:
        return None

    return (current_return - average_return) / volatility


def classify_unusualness(
    z_score: float | None,
) -> str:
    """
    Classify how unusual the movement is.
    """

    if z_score is None:
        return "UNKNOWN"

    absolute_z = abs(z_score)

    if absolute_z < 1:
        return "NORMAL"
    elif absolute_z < 2:
        return "MODERATE"
    elif absolute_z < 3:
        return "HIGH"
    else:
        return "VERY_HIGH"
def calculate_relative_movement(
    stock_return: float | None,
    market_return: float | None,
) -> float | None:
    """
    Measure how much a stock outperformed or underperformed
    the overall market.
    """

    if stock_return is None or market_return is None:
        return None

    return stock_return - market_return


def classify_relative_movement(
    relative_movement: float | None,
) -> str:
    """
    Classify the stock's movement relative to the market.
    """

    if relative_movement is None:
        return "UNKNOWN"

    absolute_movement = abs(relative_movement)

    if absolute_movement < 1:
        return "IN_LINE"
    elif absolute_movement < 3:
        return "MODERATE"
    elif absolute_movement < 5:
        return "HIGH"
    else:
        return "VERY_HIGH"
def calculate_change_since_last_seen(
    current_price: float | None,
    last_seen_price: float | None,
) -> dict:
    """
    Compare the current market price with the user's
    last-seen price.
    """

    if current_price is None or last_seen_price is None:
        return {
            "price_change": None,
            "status": "BASELINE",
        }

    price_change = calculate_price_change(
        current_price,
        last_seen_price,
    )

    return {
        "price_change": price_change,
        "status": classify_price_change(price_change),
    }