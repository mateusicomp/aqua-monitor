from datetime import datetime
from typing import Any, Dict, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.models import ChatRequest, ChatResponse, QueryIntentType, WaterParameter
from app.llm.intent_agent import classify_intent
from app.llm.answer_agent import generate_answer
from app.telemetry_repository import (
    get_latest_telemetry,
    get_telemetry_range,
    summarize_series,
    default_period_24h,
)


settings = get_settings()

app = FastAPI(title="AquaBot Chat Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    # 1) Interpretar intenção
    intent = classify_intent(req.message)

    # Só obriga device_id/site_id se for pergunta de telemetria
    if intent.intent != QueryIntentType.GENERAL_HELP:
        if not req.device_id or not req.site_id:
            raise HTTPException(
                status_code=400,
                detail="device_id e site_id são obrigatórios para perguntas sobre telemetria.",
            )

    data_summary: Optional[Dict[str, Any]] = None

    # 2) Buscar dados conforme a intenção
    if intent.intent == QueryIntentType.LATEST_STATUS:
        latest = get_latest_telemetry(req.device_id, req.site_id)
        if latest:
            data_summary = {
                "type": "latest_status",
                "device_id": latest.device_id,
                "site_id": latest.site_id,
                "sent_at": latest.sent_at.isoformat(),
                "measurements": [
                    {
                        "parameter": m.parameter,
                        "value": m.value,
                        "unit": m.unit,
                    }
                    for m in latest.measurements
                ],
            }

    elif intent.intent in (QueryIntentType.PERIOD_STATUS, QueryIntentType.TREND):
        if intent.parameter is None:
            # Se não veio parâmetro, usamos pH como default só para não falhar
            param = WaterParameter.PH
        else:
            param = intent.parameter

        start, end = default_period_24h()
        if intent.start:
            start = intent.start
        if intent.end:
            end = intent.end

        series = get_telemetry_range(
            device_id=req.device_id,
            site_id=req.site_id,
            param=param,
            start=start,
            end=end,
        )
        summary = summarize_series(series)
        if summary:
            data_summary = {
                "type": "period_status",
                "parameter": param.value,
                "series_summary": summary,
            }

    # GENERAL_HELP não usa dados, data_summary fica None

    # 3) Gerar resposta humanizada
    answer = generate_answer(
        user_question=req.message,
        intent=intent,
        data_summary=data_summary,
    )

    return ChatResponse(
        session_id=req.session_id,
        answer=answer,
        intent=intent.intent.value,
        data_used=data_summary,
    )
