from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/panoramic_partners"
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_ACCESS_TOKEN_EXPIRES_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRES_DAYS: int = 7
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 3000

    class Config:
        env_file = str(Path(__file__).parent.parent.parent.parent / ".env")
        case_sensitive = True
        extra = "ignore"

settings = Settings()