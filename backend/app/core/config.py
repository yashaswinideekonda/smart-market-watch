from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = (
        "postgresql+psycopg://market_user:market_password"
        "@localhost:5432/smart_market_watch"
    )
    redis_url: str = "redis://localhost:6379/0"
    twelve_data_api_key: str = ""

    model_config = SettingsConfigDict(
        env_file="../.env",
        extra="ignore",
    )


settings = Settings()
