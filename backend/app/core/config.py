from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "CyberTrust 360"
    TEAM_NAME: str = "Technix Pro"
    VERSION: str = "0.3.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api"

    # CORS origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]

    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "cybertrust"
    POSTGRES_PASSWORD: str = "cybertrust_secret"
    POSTGRES_DB: str = "cybertrust_db"
    DATABASE_URL: str | None = None
    DATABASE_CONNECT_TIMEOUT: int = 2
    USE_SQLITE_FALLBACK: bool = True
    SQLITE_DB_PATH: str = "./cybertrust.db"

    # Threat Intelligence Provider API Keys (Keep secret, never expose to client)
    GOOGLE_SAFE_BROWSING_API_KEY: str | None = None
    VIRUSTOTAL_API_KEY: str | None = None
    PHISHTANK_API_KEY: str | None = None
    URLHAUS_ENABLED: bool = True

    # Phase 3: AI Scam DNA LLM Provider Settings (Configurable in .env)
    LLM_PROVIDER: str = "gemini"  # "gemini" | "openai" | "none"
    GEMINI_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    LLM_MODEL_NAME: str = "gemini-1.5-flash"
    LLM_REQUEST_TIMEOUT: float = 12.0
    SCAM_MESSAGE_MAX_LENGTH: int = 5000
    SCAM_MESSAGE_MIN_LENGTH: int = 5

    # Phase 5: Blockchain Threat Report Integrity (Hardhat Local EVM)
    BLOCKCHAIN_ENABLED: bool = True
    BLOCKCHAIN_RPC_URL: str = "http://127.0.0.1:8545"
    BLOCKCHAIN_CHAIN_ID: int = 31337
    BLOCKCHAIN_CONTRACT_ADDRESS: str = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    # Local Hardhat Account #0 default key (Development / Local Testnet only)
    BLOCKCHAIN_SIGNER_PRIVATE_KEY: str = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    BLOCKCHAIN_TIMEOUT: float = 10.0

    @property
    def sync_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
