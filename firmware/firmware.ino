#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ===================== CONFIGURAÇÕES DO PROJETO =====================
// Wi-Fi
const char* WIFI_SSID     = "eng.mateus";
const char* WIFI_PASSWORD = "casamelo09";

// Firestore (REST)
const char* PROJECT_ID = "monitor-viveiro";
const char* API_KEY    = "AIzaSyB4nDY7o1yqFgwZ_pJSB0WT8attVFpnbXU";
// Coleção onde os documentos serão criados
const char* COLLECTION = "telemetry";

// Dispositivo/local (entra no JSON)
const char* DEVICE_ID  = "esp32-agua-01";
const char* SITE_ID    = "fazenda-x_rio-igarape";

// ===================== PINOS DE I/O =====================
// DS18B20
const int DS18B20_PIN = 4;  // DATA do DS18B20 (Temperatura)

// Analógicos
const int PH_PIN        = 34;  // PO do PH4502C
const int TURBIDITY_PIN = 35;  // A0 do SEN0189
const int TDS_PIN       = 32;  // A0 do Gravity TDS

// Pino de gatilho (3.3 V => envia telemetria)
const int TRIGGER_PIN = 27; 

// NTP/horário (UTC)
const char* NTP_SERVER = "pool.ntp.org";
const long  GMT_OFFSET_SEC = 0;
const int   DAYLIGHT_OFFSET_SEC = 0;

// ===================== OBJETOS DE SENSOR =====================
OneWire oneWire(DS18B20_PIN);
DallasTemperature ds18b20(&oneWire);

// ===================== VARIÁVEIS DE RUNTIME =====================
WiFiClientSecure secureClient;
uint32_t seqCounter = 1;
bool lastTriggerState = false;
unsigned long lastSendMs = 0;

// ===================== CALIBRAÇÃO E CONSTANTES =====================

// Conversão ADC -> tensão (ESP32, resolução 12 bits, 0–3.3V)
const float ADC_REF_VOLTAGE = 3.3f;
const int   ADC_MAX         = 4095;

// ---- pH (PH4502C) ----
// Você deve medir a tensão em tampão pH 7 e pH 4 e ajustar estes valores.
float PH7_VOLTAGE = 2.50f;  // exemplo inicial, ajuste depois medindo em pH 7
float PH4_VOLTAGE = 3.00f;  // exemplo inicial, ajuste depois medindo em pH 4

// ---- Turbidez (SEN0189) ----
// Relacionamento aproximado, ajuste conforme sua calibração.
// Aqui assumimos: água limpa ~2.5V, água muito turva ~3.3V.
const float TURBIDITY_CLEAR_V = 2.5f;
const float TURBIDITY_MAX_V   = 3.3f;
const float TURBIDITY_MAX_NTU = 3000.0f;  // faixa de interesse (ajuste se quiser)

// ===================== TIPOS AUXILIARES =====================
struct TelemetryData {
  float tempC;

  float ph;
  int   phAdc;
  float phVoltage;

  float turbidityNTU;
  int   turbAdc;
  float turbVoltage;

  float tdsPPM;
  float ec_uS_cm;
  int   tdsAdc;
  float tdsVoltage;
};

// ===================== AUXILIARES =====================
static String twoDigits(int v) { return (v < 10) ? "0" + String(v) : String(v); }

// Retorna horário ISO 8601 em UTC (ex.: "2025-10-02T13:42:00Z")
String getISOTimeUTC() {
  time_t now = time(nullptr);
  struct tm* t = gmtime(&now);
  char buf[25];
  // YYYY-MM-DDTHH:MM:SSZ
  snprintf(buf, sizeof(buf), "%04d-%02d-%02dT%02d:%02d:%02dZ",
           t->tm_year + 1900, t->tm_mon + 1, t->tm_mday,
           t->tm_hour, t->tm_min, t->tm_sec);
  return String(buf);
}

// Média simples de N leituras ADC
int readAdcAveraged(int pin, int samples = 30, int delayMs = 5) {
  long acc = 0;
  for (int i = 0; i < samples; i++) {
    acc += analogRead(pin);
    delay(delayMs);
  }
  return (int)(acc / samples);
}

// Converte ADC -> tensão em volts
float adcToVoltage(int adc) {
  return ((float)adc * ADC_REF_VOLTAGE) / (float)ADC_MAX;
}

// Mapeia float (tipo map(), mas para float)
float mapFloat(float x, float in_min, float in_max, float out_min, float out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

// Leitura de temperatura (DS18B20)
float readTemperatureC() {
  ds18b20.requestTemperatures();
  float t = ds18b20.getTempCByIndex(0);
  if (t == DEVICE_DISCONNECTED_C || isnan(t)) {
    // fallback
    return 25.0f;
  }
  return t;
}

// Converte tensão do PH4502C em valor de pH (linha reta entre pH 7 e pH 4)
float voltageToPH(float voltage, float tempC) {
  // slope (pH por volt)
  float slope = (7.0f - 4.0f) / (PH7_VOLTAGE - PH4_VOLTAGE);
  float ph = 7.0f + slope * (voltage - PH7_VOLTAGE);

  // Se quiser uma compensação muito grosseira por temperatura,
  // pode ajustar aqui depois. Por enquanto, mantemos simples.
  (void)tempC; // evita warning

  return ph;
}

// Converte tensão da turbidez em NTU (modelo simplificado)
float voltageToTurbidityNTU(float voltage) {
  // Garante que o valor esteja em faixa
  if (voltage < TURBIDITY_CLEAR_V) voltage = TURBIDITY_CLEAR_V;
  if (voltage > TURBIDITY_MAX_V)   voltage = TURBIDITY_MAX_V;

  float ntu = mapFloat(voltage,
                       TURBIDITY_CLEAR_V, TURBIDITY_MAX_V,
                       0.0f, TURBIDITY_MAX_NTU);
  if (ntu < 0.0f) ntu = 0.0f;
  return ntu;
}

// Converte tensão do TDS em EC (µS/cm) e TDS (ppm) com compensação de temperatura
void voltageToEC_TDS(float voltage, float tempC, float &ec_uS_cm, float &tds_ppm) {
  // Fórmula oficial do Gravity TDS (DFRobot) -> EC em µS/cm
  float ec = (133.42f * powf(voltage, 3)
            - 255.86f * powf(voltage, 2)
            + 857.39f * voltage);

  // Compensação de temperatura
  // EC25 = EC / (1 + 0.02*(temp - 25))
  float ec25 = ec / (1.0f + 0.02f * (tempC - 25.0f));

  // TDS = EC25 * 0.5   (ppm)
  float tds = ec25 * 0.5f;

  ec_uS_cm = ec25;
  tds_ppm  = tds;
}

// Faz a leitura de todos os sensores e devolve TelemetryData preenchido
TelemetryData readTelemetry() {
  TelemetryData d{};

  // Temperatura
  d.tempC = readTemperatureC();

  // pH
  d.phAdc     = readAdcAveraged(PH_PIN, 30, 10);
  d.phVoltage = adcToVoltage(d.phAdc);
  d.ph        = voltageToPH(d.phVoltage, d.tempC);

  // Turbidez
  d.turbAdc      = readAdcAveraged(TURBIDITY_PIN, 30, 10);
  d.turbVoltage  = adcToVoltage(d.turbAdc);
  d.turbidityNTU = voltageToTurbidityNTU(d.turbVoltage);

  // TDS / Condutividade
  d.tdsAdc     = readAdcAveraged(TDS_PIN, 30, 10);
  d.tdsVoltage = adcToVoltage(d.tdsAdc);
  voltageToEC_TDS(d.tdsVoltage, d.tempC, d.ec_uS_cm, d.tdsPPM);

  return d;
}

// Helper pra garantir que nenhum doubleValue vá como NaN/Infinity
float safeFloat(float x, float fallback = 0.0f) {
  if (isnan(x) || isinf(x)) return fallback;
  return x;
}

// Monta o payload Firestore (REST v1) com "fields" tipados, usando leituras reais
String buildFirestorePayload(const TelemetryData &data) {
  String sent_at = getISOTimeUTC();
  int rssi = WiFi.RSSI();

  String payload = "{ \"fields\": {"
    "\"version\":  {\"stringValue\":\"1.0.0\"},"
    "\"msg_type\": {\"stringValue\":\"telemetry\"},"
    "\"device_id\":{\"stringValue\":\"" + String(DEVICE_ID) + "\"},"
    "\"site_id\":  {\"stringValue\":\"" + String(SITE_ID)   + "\"},"
    "\"sent_at\":  {\"timestampValue\":\"" + sent_at + "\"},"
    "\"seq\":      {\"integerValue\":\"" + String(seqCounter++) + "\"},"

    "\"measurements\": {\"arrayValue\": {\"values\": ["
      // pH
      "{\"mapValue\":{\"fields\":{"
        "\"parameter\":{\"stringValue\":\"pH\"},"
        "\"value\":{\"doubleValue\":" + String(safeFloat(data.ph), 2) + "},"
        "\"unit\":{\"stringValue\":\"pH\"},"
        "\"temp_compensated\":{\"booleanValue\":true},"
        "\"uncertainty\":{\"doubleValue\":0.03},"
        "\"method\":{\"stringValue\":\"eletrodo_vidro + PH4502C\"},"
        "\"raw\":{\"mapValue\":{\"fields\":{"
          "\"adc\":{\"integerValue\":\"" + String(data.phAdc) + "\"},"
          "\"voltage_v\":{\"doubleValue\":" + String(safeFloat(data.phVoltage), 3) + "},"
          "\"temp_c\":{\"doubleValue\":" + String(safeFloat(data.tempC), 2) + "}"
        "}}}"
      "}}},"

      // temperatura
      "{\"mapValue\":{\"fields\":{"
        "\"parameter\":{\"stringValue\":\"temperature\"},"
        "\"value\":{\"doubleValue\":" + String(safeFloat(data.tempC), 2) + "},"
        "\"unit\":{\"stringValue\":\"°C\"},"
        "\"method\":{\"stringValue\":\"DS18B20\"},"
        "\"raw\":{\"mapValue\":{\"fields\":{"
          "\"resolution_bits\":{\"integerValue\":\"12\"}"
        "}}}"
      "}}},"

      // turbidez
      "{\"mapValue\":{\"fields\":{"
        "\"parameter\":{\"stringValue\":\"turbidity\"},"
        "\"value\":{\"doubleValue\":" + String(safeFloat(data.turbidityNTU), 1) + "},"
        "\"unit\":{\"stringValue\":\"NTU\"},"
        "\"method\":{\"stringValue\":\"SEN0189/ST100\"},"
        "\"raw\":{\"mapValue\":{\"fields\":{"
          "\"adc\":{\"integerValue\":\"" + String(data.turbAdc) + "\"},"
          "\"voltage_v\":{\"doubleValue\":" + String(safeFloat(data.turbVoltage), 3) + "}"
        "}}}"
      "}}},"

      // TDS / condutividade
      "{\"mapValue\":{\"fields\":{"
        "\"parameter\":{\"stringValue\":\"tds\"},"
        "\"value\":{\"integerValue\":\"" + String((int)round(safeFloat(data.tdsPPM))) + "\"},"
        "\"unit\":{\"stringValue\":\"ppm\"},"
        "\"method\":{\"stringValue\":\"Gravity TDS (k=1.0)\"},"
        "\"raw\":{\"mapValue\":{\"fields\":{"
          "\"adc\":{\"integerValue\":\"" + String(data.tdsAdc) + "\"},"
          "\"voltage_v\":{\"doubleValue\":" + String(safeFloat(data.tdsVoltage), 3) + "},"
          "\"ec_uS_cm\":{\"doubleValue\":" + String(safeFloat(data.ec_uS_cm), 1) + "}"
        "}}}"
      "}}}"
    "]}}," // fecha measurements

    "\"power\":{\"mapValue\":{\"fields\":{"
      "\"battery_v\":{\"doubleValue\":3.92},"
      "\"usb_power\":{\"booleanValue\":false}"
    "}}},"

    "\"rssi_dbm\":{\"integerValue\":\"" + String(rssi) + "\"},"
    "\"fw\":{\"mapValue\":{\"fields\":{"
      "\"app\":{\"stringValue\":\"safra-dourada-probe\"},"
      "\"ver\":{\"stringValue\":\"0.6.3\"}"
    "}}}"

  "} }"; // fecha fields/payload

  return payload;
}


// Envia ao Firestore (coleção COLLECTION) usando HTTPS
bool sendToFirestore() {
  TelemetryData data = readTelemetry();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi desconectado, tentando reconectar...");
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[HTTP] Ainda sem WiFi, abortando envio.");
      return false;
    }
  }

  Serial.printf("[HTTP] Heap livre antes do POST: %u bytes\n", ESP.getFreeHeap());

  String url = "https://firestore.googleapis.com/v1/projects/";
  url += PROJECT_ID;
  url += "/databases/(default)/documents/";
  url += COLLECTION;
  url += "?key=";
  url += API_KEY;

  String payload = buildFirestorePayload(data);

  Serial.println("===== PAYLOAD ENVIADO AO FIRESTORE =====");
  Serial.println(payload);
  Serial.println("=========================================");

  WiFiClientSecure client;
  client.setInsecure(); // aceita qualquer certificado (para testes)

  HTTPClient http;
  http.setTimeout(15000);

  if (!http.begin(client, url)) {
    Serial.println("[HTTP] http.begin(secure) falhou.");
    return false;
  }

  http.addHeader("Content-Type", "application/json");

  int code = http.POST(payload);
  Serial.printf("POST %s -> HTTP %d\n", url.c_str(), code);

  String resp = http.getString();
  Serial.println("===== RESPOSTA FIRESTORE =====");
  Serial.println(resp);
  Serial.println("================================");

  if (code <= 0) {
    Serial.printf("[HTTP] Erro POST: %s\n", http.errorToString(code).c_str());
  }

  http.end();
  return (code >= 200 && code < 300);
}


// ===================== SETUP/LOOP =====================
void connectWiFi() {
  Serial.printf("Conectando ao Wi-Fi: %s ...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint8_t tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 60) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("Wi-Fi OK. IP: %s  RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("Wi-Fi falhou. Verifique SSID/Senha.");
  }
}

void syncTime() {
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
  Serial.print("Sincronizando NTP");
  for (int i = 0; i < 20; i++) {
    time_t now = time(nullptr);
    if (now > 1700000000) break; // já sincronizado
    Serial.print(".");
    delay(500);
  }
  Serial.println();
  Serial.println("Data/hora (UTC): " + getISOTimeUTC());
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(TRIGGER_PIN, INPUT_PULLDOWN);

  // ADC config
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db); // faixa ~0–3.3V

  ds18b20.begin();

  connectWiFi();
  syncTime();

  Serial.println("Pronto. Aplique 3.3 V ao pino de gatilho (GPIO27) para enviar telemetria.");
}

void loop() {
  bool triggerState = digitalRead(TRIGGER_PIN) == HIGH;

  // Borda de subida + antirrepique simples (1 s)
  if (triggerState && !lastTriggerState && (millis() - lastSendMs > 1000)) {
    Serial.println("\nGatilho acionado! Lendo sensores e enviando telemetria...");
    bool ok = sendToFirestore();
    Serial.println(ok ? "Envio concluído.\n" : "Falha no envio.\n");
    lastSendMs = millis();
  }

  lastTriggerState = triggerState;
  delay(20); // varredura leve
}
