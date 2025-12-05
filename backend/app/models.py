from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    session_id: str
    message: str
    device_id: str | None = None
    site_id: str | None = None


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    intent: str
    data_used: Optional[Dict[str, Any]] = None


class WaterParameter(str, Enum):
    PH = "ph"
    TEMPERATURE = "temperature"
    TURBIDITY = "turbidity"
    TDS = "tds"


class QueryIntentType(str, Enum):
    LATEST_STATUS = "latest_status"
    PERIOD_STATUS = "period_status"
    TREND = "trend"
    GENERAL_HELP = "general_help"


class QueryIntent(BaseModel):
    intent: QueryIntentType
    parameter: Optional[WaterParameter] = None
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    aggregation: Optional[str] = None


class Measurement(BaseModel):
    parameter: str
    value: float
    unit: str


class TelemetryDocument(BaseModel):
    id: str
    device_id: str
    site_id: str
    sent_at: datetime
    measurements: List[Measurement]
