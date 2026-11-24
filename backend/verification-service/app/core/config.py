from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import List


class Settings(BaseSettings):
    PORT: int = Field(default=8000, description="FastAPI Server Port")
    HOST: str = Field(default="0.0.0.0", description="FastAPI Host")
    ENVIRONMENT: str = Field(default="development", description="Environment mode")
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:5000,http://localhost:3000",
        description="Comma-separated allowed CORS origins"
    )

    # API Keys
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API Key")
    TAVILY_API_KEY: str = Field(default="", description="Tavily Search API Key")
    NEWSAPI_KEY: str = Field(default="", description="NewsAPI Key")
    GOOGLE_FACT_CHECK_API_KEY: str = Field(default="", description="Google Fact Check Tools API Key")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
