from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    fmp_api_key: str
    # Custom LLM endpoint (OpenAI-compatible)
    llm_url: str
    api_key: str
    model: str
    database_url: str = "sqlite:///./finora.db"
    sec_user_agent: str = "Finora/1.0 tunglam030699@gmail.com"
    cron_day_of_week: str = "sun"
    cron_hour: int = 20
    cron_minute: int = 0
    webhook_url: str = ""
    trigger_api_key: list[str]

    class Config:
        env_file = ".env"


settings = Settings()
