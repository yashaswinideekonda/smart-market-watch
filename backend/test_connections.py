from sqlalchemy import text

from app.database.session import engine
from app.database.redis import redis_client


def test_postgres():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print("PostgreSQL:", result.scalar())


def test_redis():
    print("Redis:", redis_client.ping())


if __name__ == "__main__":
    test_postgres()
    test_redis()
