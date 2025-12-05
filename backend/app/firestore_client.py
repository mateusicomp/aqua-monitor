from google.cloud import firestore
from app.config import get_settings


settings = get_settings()

def get_firestore_client() -> firestore.Client:
    if settings.FIRESTORE_PROJECT_ID:
        return firestore.Client(project=settings.FIRESTORE_PROJECT_ID)
    return firestore.Client()
