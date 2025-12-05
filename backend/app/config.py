import os
from functools import lru_cache
from dotenv import load_dotenv


load_dotenv()

class Settings:
    FIRESTORE_PROJECT_ID: str = os.getenv("FIRESTORE_PROJECT_ID", "")
    FIRESTORE_TELEMETRY_COLLECTION: str = os.getenv(
        "FIRESTORE_TELEMETRY_COLLECTION", "telemetry"
    )

    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL_NAME: str = os.getenv("OLLAMA_MODEL_NAME", "qwen2:0.5b")

    MAX_HISTORY_MESSAGES: int = 10

@lru_cache
def get_settings() -> Settings:
    return Settings()
