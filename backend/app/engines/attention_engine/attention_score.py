def _price_score(price_change):
    if price_change is None:
        return 0

    return min(abs(price_change) / 5 * 35, 35)


def _unusualness_score(z_score):
    if z_score is None:
        return 0

    return min(abs(z_score) / 3 * 35, 35)


def _volume_score(volume_ratio):
    if volume_ratio is None or volume_ratio <= 1:
        return 0

    return min((volume_ratio - 1) / 2 * 20, 20)


def _relative_score(relative_movement):
    if relative_movement is None:
        return 0

    return min(abs(relative_movement) / 5 * 10, 10)


def calculate_attention_score(
    price_change,
    z_score,
    volume_ratio,
    relative_movement,
):
    price = _price_score(price_change)
    unusualness = _unusualness_score(z_score)
    volume = _volume_score(volume_ratio)
    relative = _relative_score(relative_movement)

    total = round(price + unusualness + volume + relative)

    return min(total, 100)


def calculate_attention_breakdown(
    price_change,
    z_score,
    volume_ratio,
    relative_movement,
):
    price = round(_price_score(price_change))
    unusualness = round(_unusualness_score(z_score))
    volume = round(_volume_score(volume_ratio))
    relative = round(_relative_score(relative_movement))

    return {
        "price": price,
        "unusualness": unusualness,
        "volume": volume,
        "relative": relative,
        "total": min(price + unusualness + volume + relative, 100),
    }