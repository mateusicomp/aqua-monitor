from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, model_validator


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
    GENERAL_HELP = "general_help"

    LATEST_STATUS = "latest_status"      # última leitura (geral ou de um parâmetro)
    PERIOD_STATUS = "period_status"      # resumo no período (se não especificar estatística, vira "summary")

    AVG_VALUE = "avg_value"              # média no período
    MAX_VALUE = "max_value"              # máximo no período
    MIN_VALUE = "min_value"              # mínimo no período

    TREND = "trend"                      # tendência no período/últimos N dias
    IDEAL_CHECK = "ideal_check"          # está dentro da faixa ideal?

    COMPARE_PERIODS = "compare_periods"  # comparar dois períodos (ex: hoje vs ontem)


class QueryIntent(BaseModel):
    intent: QueryIntentType

    parameter: Optional[WaterParameter] = None

    # período opcional
    start: Optional[datetime] = None
    end: Optional[datetime] = None

    # quando o usuário fala "últimos X dias"
    days: Optional[int] = Field(default=None, ge=1, le=60)

    # se pedir algo tipo "ideal", "faixa recomendada"
    include_ideal: Optional[bool] = False

    @model_validator(mode="after")
    def cleanup(self):
        # Se for help geral, não pode inventar datas
        if self.intent == QueryIntentType.GENERAL_HELP:
            self.start = None
            self.end = None
            self.days = None
            self.parameter = None
            self.include_ideal = False
        return self


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
