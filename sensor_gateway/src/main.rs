use axum::{routing::post, Router, Json};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;

mod signing;

#[derive(Debug, Deserialize)]
struct RawTelemetry {
    version: String,
    msg_type: String,
    device_id: String,
    site_id: String,
    sent_at: String,
    seq: u64,
    measurements: Vec<Measurement>,
}

#[derive(Debug, Deserialize)]
struct Measurement {
    parameter: String,
    value: f64,
    unit: String,
}

#[derive(Debug, Serialize)]
struct SignedTelemetry<'a> {
    payload: &'a RawTelemetry,
    signature: String,
}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/ingest", post(ingest_handler));

    let addr = SocketAddr::from(([127, 0, 0, 1], 8081));
    println!("Rust gateway ouvindo em {}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

async fn ingest_handler(Json(payload): Json<RawTelemetry>) -> Json<String> {
    // 1) validação simples (exemplo)
    if payload.measurements.is_empty() {
        return Json("Nenhuma medição encontrada".to_string());
    }

    // 2) assinar o JSON (ownership/borrowing aqui é legal pra estudar)
    let signature = signing::sign_payload(&payload);

    let signed = SignedTelemetry {
        payload: &payload,
        signature,
    };

    // 3) encaminhar para backend principal (FastAPI ou outro)
    if let Err(e) = forward_to_backend(&signed).await {
        eprintln!("Erro ao encaminhar: {}", e);
    }

    Json("OK".to_string())
}

async fn forward_to_backend(signed: &SignedTelemetry<'_>) -> Result<(), reqwest::Error> {
    let client = reqwest::Client::new();
    client
        .post("http://localhost:8001/sensor_ingest") // endpoint do backend principal
        .json(&signed)
        .send()
        .await?
        .error_for_status()?;
    Ok(())
}
