from __future__ import annotations
from datetime import datetime, timedelta
from statistics import mean
from typing import Dict, List, Optional, Tuple
from google.cloud.firestore_v1 import Query
from app.firestore_client import get_firestore_client
from app.config import get_settings
from app.models import TelemetryDocument, Measurement, WaterParameter


settings = get_settings()
db = get_firestore_client()
COLLECTION = settings.FIRESTORE_TELEMETRY_COLLECTION


def _normalize_param(name: str) -> Optional[WaterParameter]:
    name_lower = name.strip().lower()
    mapping = {
        "ph": WaterParameter.PH,
        "pH".lower(): WaterParameter.PH,
        "temperature": WaterParameter.TEMPERATURE,
        "temperatura": WaterParameter.TEMPERATURE,
        "turbidity": WaterParameter.TURBIDITY,
        "turbidez": WaterParameter.TURBIDITY,
        "tds": WaterParameter.TDS,
        "condutividade": WaterParameter.TDS,
        "conductivity": WaterParameter.TDS,
    }
    return mapping.get(name_lower)


from google.cloud.firestore_v1 import Query

def get_latest_telemetry(device_id: str, site_id: str) -> Optional[TelemetryDocument]:
    query: Query = (
        db.collection(COLLECTION)
        .where("device_id", "==", device_id)
        .where("site_id", "==", site_id)
        .order_by("sent_at")          # ASCENDENTE
        .limit_to_last(1)             # pega o último da ordenação
    )

    docs = list(query.get())
    if not docs:
        return None

    doc = docs[0]
    data = doc.to_dict()
    return _doc_to_model(doc.id, data)



def get_telemetry_range(
    device_id: str,
    site_id: str,
    param: WaterParameter,
    start: datetime,
    end: datetime,
) -> List[Tuple[datetime, float, str]]:
    query: Query = (
        db.collection(COLLECTION)
        .where("device_id", "==", device_id)
        .where("site_id", "==", site_id)
        .where("sent_at", ">=", start)
        .where("sent_at", "<=", end)
        .order_by("sent_at")
    )

    series: List[Tuple[datetime, float, str]] = []
    for doc in query.stream():
        data = doc.to_dict()
        sent_at = data.get("sent_at")
        for m in data.get("measurements", []):
            p = _normalize_param(m.get("parameter", ""))
            if p == param:
                series.append((sent_at, float(m["value"]), m.get("unit", "")))
    return series


def summarize_series(series: List[Tuple[datetime, float, str]]) -> Optional[Dict]:
    if not series:
        return None

    timestamps = [t for (t, _, _) in series]
    values = [v for (_, v, _) in series]
    units = [u for (_, _, u) in series]
    unit = units[0] if units else ""

    return {
        "start": min(timestamps),
        "end": max(timestamps),
        "count": len(series),
        "min": min(values),
        "max": max(values),
        "avg": mean(values),
        "unit": unit,
    }


def default_period_24h() -> Tuple[datetime, datetime]:
    now = datetime.now().astimezone()
    return now - timedelta(hours=24), now


def _doc_to_model(doc_id: str, data: Dict) -> TelemetryDocument:
    measurements = [
        Measurement(
            parameter=m["parameter"],
            value=float(m["value"]),
            unit=m["unit"],
        )
        for m in data.get("measurements", [])
    ]
    return TelemetryDocument(
        id=doc_id,
        device_id=data["device_id"],
        site_id=data["site_id"],
        sent_at=data["sent_at"],
        measurements=measurements,
    )
