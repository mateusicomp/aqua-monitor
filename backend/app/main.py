from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models import ChatRequest, ChatResponse, QueryIntentType, WaterParameter
from app.llm.intent_agent import classify_intent
from app.llm.answer_agent import generate_general_help_answer
from app.telemetry_repository import (
    get_latest_telemetry,
    get_telemetry_range,
    summarize_series,
    extreme_in_series,
    trend_in_series,
    default_period,
)

app = FastAPI(title="AquaBot Chat Backend", version="1.1.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Faixas "típicas"
IDEAL = {
    WaterParameter.PH: {"min": 6.5, "max": 8.5, "unit": "pH"},
    WaterParameter.TEMPERATURE: {"min": 20.0, "max": 30.0, "unit": "°C"},
    WaterParameter.TURBIDITY: {"min": 0.0, "max": 10.0, "unit": "NTU"},
    WaterParameter.TDS: {"min": 0.0, "max": 500.0, "unit": "ppm"},
}


def infer_parameter_from_text(text: str) -> Optional[WaterParameter]:
    """
    Fallback determinístico para quando a LLM NÃO preencher intent.parameter.
    Isso é importante para modelos pequenos (ex: qwen2:0.5b).
    """
    t = text.lower()

    # pH
    if "ph" in t or "p h" in t:
        return WaterParameter.PH

    # temperatura
    if "temperatura" in t or "temp" in t or "°c" in t:
        return WaterParameter.TEMPERATURE

    # turbidez
    if "turbidez" in t or "ntu" in t:
        return WaterParameter.TURBIDITY

    # tds / condutividade
    if "tds" in t or "condutividade" in t or "ppm" in t:
        return WaterParameter.TDS

    return None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    intent = classify_intent(req.message)

    # DEBUG (você pode remover depois)
    print("INTENT DEBUG:", intent)

    # ✅ Fallback determinístico: se a LLM não identificou o parâmetro, tentamos pelo texto
    if intent.parameter is None:
        inferred = infer_parameter_from_text(req.message)
        if inferred is not None:
            intent.parameter = inferred

    # Help geral: não exige device/site e não consulta Firestore
    if intent.intent == QueryIntentType.GENERAL_HELP:
        answer = generate_general_help_answer(req.message)
        return ChatResponse(
            session_id=req.session_id,
            answer=answer,
            intent=intent.intent.value,
            data_used=None,
        )

    # A partir daqui, tudo é telemetria -> exige device/site
    if not req.device_id or not req.site_id:
        raise HTTPException(
            status_code=400,
            detail="device_id e site_id são obrigatórios para perguntas sobre telemetria.",
        )

    # Se usuário não especificou parâmetro em intents que exigem, pede clarificação curta
    if intent.intent in (
        QueryIntentType.AVG_VALUE,
        QueryIntentType.MAX_VALUE,
        QueryIntentType.MIN_VALUE,
        QueryIntentType.TREND,
        QueryIntentType.IDEAL_CHECK,
    ) and intent.parameter is None:
        return ChatResponse(
            session_id=req.session_id,
            answer="Você quer saber sobre qual parâmetro: pH, temperatura, turbidez ou TDS?",
            intent=intent.intent.value,
            data_used=None,
        )

    # Período padrão: se vier days usa days, senão 1 dia (24h)
    if intent.days:
        start, end = default_period(days=intent.days)
    else:
        start, end = default_period(days=1)

    if intent.start:
        start = intent.start
    if intent.end:
        end = intent.end

    data_used: Optional[Dict[str, Any]] = None

    # -------- latest_status --------
    if intent.intent == QueryIntentType.LATEST_STATUS:
        latest = get_latest_telemetry(req.device_id, req.site_id)
        if not latest:
            return ChatResponse(
                session_id=req.session_id,
                answer="Ainda não encontrei leituras para esse dispositivo/local.",
                intent=intent.intent.value,
                data_used=None,
            )

        # Se perguntou de um parâmetro específico, responde só ele
        if intent.parameter:
            wanted = intent.parameter.value

            for m in latest.measurements:
                m_name = m.parameter.strip().lower()

                # normaliza pH
                if wanted == "ph" and m_name in ("ph", "pH".lower()):
                    answer = (
                        f"Última {pretty_name(intent.parameter)}: "
                        f"{m.value:.2f}{m.unit} (em {latest.sent_at.isoformat()})."
                    )
                    return ChatResponse(
                        session_id=req.session_id,
                        answer=answer,
                        intent=intent.intent.value,
                        data_used=None,
                    )

                if m_name == wanted:
                    answer = (
                        f"Última {pretty_name(intent.parameter)}: "
                        f"{m.value:.2f}{m.unit} (em {latest.sent_at.isoformat()})."
                    )
                    return ChatResponse(
                        session_id=req.session_id,
                        answer=answer,
                        intent=intent.intent.value,
                        data_used=None,
                    )

            return ChatResponse(
                session_id=req.session_id,
                answer=(
                    f"Encontrei a última leitura, mas não veio o parâmetro "
                    f"{pretty_name(intent.parameter)} nesse envio."
                ),
                intent=intent.intent.value,
                data_used=None,
            )

        # caso geral: resumo bem curto
        answer = (
            f"Última leitura em {latest.sent_at.isoformat()} "
            f"para {latest.device_id}/{latest.site_id}."
        )
        return ChatResponse(
            session_id=req.session_id,
            answer=answer,
            intent=intent.intent.value,
            data_used=None,
        )

    # A partir daqui, usamos séries de um parâmetro
    param = intent.parameter
    if param is None:
        return ChatResponse(
            session_id=req.session_id,
            answer="Você quer saber sobre qual parâmetro: pH, temperatura, turbidez ou TDS?",
            intent=intent.intent.value,
            data_used=None,
        )

    series = get_telemetry_range(req.device_id, req.site_id, param, start, end)

    if not series:
        return ChatResponse(
            session_id=req.session_id,
            answer="Não encontrei dados nesse período. Tente aumentar o intervalo (ex: últimos 7 dias).",
            intent=intent.intent.value,
            data_used=None,
        )

    # -------- max/min/avg/period_status --------
    if intent.intent == QueryIntentType.MAX_VALUE:
        best = extreme_in_series(series, "max")
        answer = (
            f"O maior valor de {pretty_name(param)} no período foi "
            f"{best['value']:.2f}{best['unit']} (em {best['sent_at'].isoformat()})."
        )
        return ChatResponse(
            session_id=req.session_id,
            answer=answer,
            intent=intent.intent.value,
            data_used=None,
        )

    if intent.intent == QueryIntentType.MIN_VALUE:
        best = extreme_in_series(series, "min")
        answer = (
            f"O menor valor de {pretty_name(param)} no período foi "
            f"{best['value']:.2f}{best['unit']} (em {best['sent_at'].isoformat()})."
        )
        return ChatResponse(
            session_id=req.session_id,
            answer=answer,
            intent=intent.intent.value,
            data_used=None,
        )

    if intent.intent == QueryIntentType.AVG_VALUE:
        summ = summarize_series(series)
        answer = (
            f"Média de {pretty_name(param)} no período: "
            f"{summ['avg']:.2f}{summ['unit']} (amostras: {summ['count']})."
        )
        return ChatResponse(
            session_id=req.session_id,
            answer=answer,
            intent=intent.intent.value,
            data_used=None,
        )

    if intent.intent == QueryIntentType.PERIOD_STATUS:
        summ = summarize_series(series)
        answer = (
            f"{pretty_name(param)} no período: média {summ['avg']:.2f}{summ['unit']}, "
            f"mín {summ['min']:.2f}, máx {summ['max']:.2f} (amostras: {summ['count']})."
        )
        return ChatResponse(
            session_id=req.session_id,
            answer=answer,
            intent=intent.intent.value,
            data_used=None,
        )

    # -------- trend --------
    if intent.intent == QueryIntentType.TREND:
        tr = trend_in_series(series)
        if not tr:
            return ChatResponse(
                session_id=req.session_id,
                answer="Preciso de pelo menos 2 leituras para calcular tendência.",
                intent=intent.intent.value,
                data_used=None,
            )

        dir_txt = {"up": "subindo", "down": "caindo", "stable": "estável"}[tr["direction"]]
        answer = (
            f"Tendência de {pretty_name(param)} no período: {dir_txt}. "
            f"Variação {tr['delta']:.2f}{tr['unit']} (de {tr['first']:.2f} para {tr['last']:.2f})."
        )
        return ChatResponse(
            session_id=req.session_id,
            answer=answer,
            intent=intent.intent.value,
            data_used=None,
        )

    # -------- ideal_check --------
    if intent.intent == QueryIntentType.IDEAL_CHECK:
        latest_point = series[-1]
        value = latest_point[1]
        ideal = IDEAL.get(param)
        if not ideal:
            return ChatResponse(
                session_id=req.session_id,
                answer="Não tenho faixa ideal configurada para esse parâmetro.",
                intent=intent.intent.value,
                data_used=None,
            )

        ok = ideal["min"] <= value <= ideal["max"]
        status = "dentro" if ok else "fora"
        answer = (
            f"A {pretty_name(param)} mais recente foi {value:.2f}{latest_point[2]} e está {status} da faixa ideal "
            f"({ideal['min']:.1f}–{ideal['max']:.1f}{ideal['unit']})."
        )
        return ChatResponse(
            session_id=req.session_id,
            answer=answer,
            intent=intent.intent.value,
            data_used=None,
        )

    # fallback
    return ChatResponse(
        session_id=req.session_id,
        answer="Não consegui classificar sua pergunta. Tente perguntar de outra forma.",
        intent=intent.intent.value,
        data_used=data_used,
    )


def pretty_name(p: WaterParameter) -> str:
    return {
        WaterParameter.PH: "pH",
        WaterParameter.TEMPERATURE: "temperatura",
        WaterParameter.TURBIDITY: "turbidez",
        WaterParameter.TDS: "TDS",
    }[p]
