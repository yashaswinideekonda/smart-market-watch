import httpx

from app.core.config import settings


class MarketDataService:
    BASE_URL = "https://api.twelvedata.com"

    def __init__(self):
        self.api_key = settings.twelve_data_api_key

    def get_quote(self, symbol: str) -> dict:
        url = f"{self.BASE_URL}/quote"

        params = {
    "symbol": symbol,
    "apikey": self.api_key,
}

        response = httpx.get(
            url,
            headers=headers,
            params=params,
            timeout=10.0,
        )

        response.raise_for_status()

        data = response.json()

        if "code" in data and data.get("code") != 200:
            raise RuntimeError(
                data.get("message", "Twelve Data API error")
            )

        return data

    def get_historical_data(
        self,
        symbol: str,
        interval: str = "1day",
        outputsize: int = 30,
    ) -> dict:
        url = f"{self.BASE_URL}/time_series"

        headers = {
            "Authorization": f"apikey {self.api_key}"
        }

        params = {
            "symbol": symbol,
            "interval": interval,
            "outputsize": outputsize,
        }

        response = httpx.get(
            url,
            headers=headers,
            params=params,
            timeout=15.0,
        )

        response.raise_for_status()

        data = response.json()

        if "code" in data and data.get("code") != 200:
            raise RuntimeError(
                data.get("message", "Twelve Data API error")
            )

        return data
