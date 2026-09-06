def generate_change_explanation(
    price_change: float | None,
    z_score: float | None,
    volume_ratio: float | None,
    attention_score: int,
) -> dict:
    reasons = []

    # Price movement
    if price_change is not None:
        if abs(price_change) >= 5:
            reasons.append(
                f"Price moved {price_change:+.2f}% since you last saw it."
            )
        elif abs(price_change) >= 3:
            reasons.append(
                f"Price moved {price_change:+.2f}% since you last saw it."
            )
        elif abs(price_change) >= 1:
            reasons.append(
                f"Price moved {price_change:+.2f}% since you last saw it."
            )

    # Unusual movement
    if z_score is not None:
        if abs(z_score) >= 3:
            reasons.append(
                "The movement is extremely unusual compared with the stock's normal behavior."
            )
        elif abs(z_score) >= 2:
            reasons.append(
                "The movement is highly unusual compared with the stock's normal behavior."
            )
        elif abs(z_score) >= 1:
            reasons.append(
                "The stock is moving more than it normally does."
            )

    # Volume
    if volume_ratio is not None:
        if volume_ratio >= 3:
            reasons.append(
                "Trading volume is more than 3x its usual level."
            )
        elif volume_ratio >= 2:
            reasons.append(
                "Trading volume is more than 2x its usual level."
            )
        elif volume_ratio >= 1.2:
            reasons.append(
                "Trading volume is higher than usual."
            )

    # Overall attention message
    if attention_score >= 80:
        headline = "Very high attention"
    elif attention_score >= 60:
        headline = "High attention"
    elif attention_score >= 30:
        headline = "Worth a closer look"
    else:
        headline = "Nothing unusual"

    # If no unusual signals were detected
    if not reasons:
        reasons.append(
            "Price movement and trading activity are within the stock's normal range."
        )

    return {
        "headline": headline,
        "reasons": reasons,
    }