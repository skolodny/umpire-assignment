from functools import lru_cache
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://umpire:umpire@localhost:5432/umpire_db"
    secret_key: str = "changeme-secret-key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@umpire.local"

    ical_feed_url_int_i_rookies: str = ""
    ical_feed_url_int_ii: str = ""
    app_base_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
