def _price_score(price_change: float | None) -> float:
    if price_change is None:
        return 0

    return min(abs(price_change) / 5 * 35, 35)


def _unusualness_score(z_score: float | None) -> float:
    if z_score is None:
        return 0

    return min(abs(z_score) / 3 * 35, 35)


def _volume_score(volume_ratio: float | None) -> float:
    if volume_ratio is None or volume_ratio <= 1:
        return 0

    return min((volume_ratio - 1) / 2 * 20, 20)


def _relative_score(relative_movement: float | None) -> float:
    if relative_movement is None:
        return 0

    return min(abs(relative_movement) / 5 * 10, 10)


def calculate_attention_score(
    price_change: float | None,
    z_score: float | None,
    volume_ratio: float | None,
    relative_movement: float | None,
) -> int:
    """
    Calculate an explainable attention score from 0 to 100.

    Price movement:       35 points
    Unusualness:          35 points
    Volume anomaly:       20 points
    Market-relative:      10 points
    """

    score = (
        _price_score(price_change)
        + _unusualness_score(z_score)
        + _volume_score(volume_ratio)
        + _relative_score(relative_movement)
    )

    return round(min(score, 100))


def classify_attention_score(score: int) -> str:
    if score < 30:
        return "NORMAL"
    elif score < 60:
        return "MODERATE"
    elif score < 80:
        return "HIGH"
    else:
        return "VERY_HIGH"