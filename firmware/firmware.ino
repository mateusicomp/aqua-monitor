#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <PubSubClient.h>


// ===================== CONFIGURAÇÕES DO PROJETO =====================
// Wi-Fi
const char* WIFI_SSID     = "WiFi-LMA";
const char* WIFI_PASSWORD = "@ufam.lma";

// Firestore (REST)
const char* PROJECT_ID = "monitor-viveiro";
const char* API_KEY    = "AIzaSyB4nDY7o1yqFgwZ_pJSB0WT8attVFpnbXU";
// Coleção onde os documentos serão criados
const char* COLLECTION = "telemetry";

// =============== PINOS ===============
const int TRIGGER_IN_PIN = 27;      // recebe 3.3V via comando MQTT pelo pino 26 ou da chave manual 

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
// Deve-se medir a tensão em tampão pH 7 e pH 4 e ajustar estes valores.
float PH7_VOLTAGE = 2.50f;  
float PH4_VOLTAGE = 3.00f; 

// ---- Turbidez (SEN0189) ----
// Relacionamento aproximado, deve-se ajustar conforme a calibração.
const float TURB_V_CLEAR = 3.50f;   // água limpa
const float TURB_V_MUDDY = 1.50f;   // água bem turva
const float TURB_V_DRY   = 2.75f;   // sensor no ar (descartar leitura)

// NTU desejado
const float TURB_NTU_MIN = 5.0f;
const float TURB_NTU_MAX = 100.0f;

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

// ===================== MQTT =====================

// Cliente TCP para MQTT (porta 1883)
WiFiClient mqttWifiClient;
PubSubClient mqttClient(mqttWifiClient);

const char* MQTT_BROKER    = "broker.hivemq.com";
const uint16_t MQTT_PORT   = 1883;
const char* MQTT_CLIENT_ID = "esp32-agua-01"; // pode ser o próprio DEVICE_ID

// Tópico de comando (deve bater com a definição no frontend)
String mqttCmdTopic = String("aquamonitor/") + DEVICE_ID + "/command/measure";

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

  (void)tempC; // evita warning, compensação de temperatura pode ser adicionada depois

  return ph;
}

// Converte tensão para NTU (5 a 100)
float voltageToTurbidityNTU(float V) {
  // 1. Detecta sensor fora da água
  if (V > TURB_V_MUDDY && V < TURB_V_CLEAR) {
    // ok, está na água
  } else if (V > TURB_V_CLEAR) {
    // tensão acima do máximo possível em água → fora da água
    return 0.0f;  // ou -1.0f se quiser sinalizar "sem água"
  }

  // 2. Limita valores dentro do intervalo calibrado
  if (V > TURB_V_CLEAR) V = TURB_V_CLEAR;
  if (V < TURB_V_MUDDY) V = TURB_V_MUDDY;

  // 3. Fração de turbidez (0 = limpa, 1 = muito turva)
  float fraction = (TURB_V_CLEAR - V) / (TURB_V_CLEAR - TURB_V_MUDDY);
  if (fraction < 0.0f) fraction = 0.0f;
  if (fraction > 1.0f) fraction = 1.0f;

  // 4. Converte para NTU
  float ntu = TURB_NTU_MIN + fraction * (TURB_NTU_MAX - TURB_NTU_MIN);

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
  Serial.printf("[TURBIDEZ] ADC=%d  V=%.3f\n", d.turbAdc, d.turbVoltage);
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
  //Serial.println("===== RESPOSTA FIRESTORE =====");
  //Serial.println(resp);
  //Serial.println("================================");

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

// ===================== MQTT (setup/callback) =====================

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String t = String(topic);
  Serial.print("[MQTT] Mensagem recebida em: ");
  Serial.println(t);

  Serial.print("[MQTT] Payload: ");
  for (unsigned int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();

  if (t == mqttCmdTopic) {
    Serial.println("[MQTT] Comando de medida recebido! Enviando telemetria para Firestore...");

    bool ok = sendToFirestore();
    Serial.println(ok ? "[MQTT] Medida enviada com sucesso" : "[MQTT] Falha no envio");
  }
}

void setupMqtt() {
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
}

void ensureMqttConnected() {
  if (mqttClient.connected()) return;

  Serial.print("[MQTT] Conectando ao broker ");
  Serial.print(MQTT_BROKER);
  Serial.print(":");
  Serial.print(MQTT_PORT);
  Serial.println(" ...");

  if (mqttClient.connect(MQTT_CLIENT_ID)) {
    Serial.println("[MQTT] Conectado ao broker MQTT!");

    // Assina o tópico de comando
    mqttClient.subscribe(mqttCmdTopic.c_str(), 1);
    Serial.print("[MQTT] Assinado tópico: ");
    Serial.println(mqttCmdTopic);
  } else {
    Serial.print("[MQTT] Falha ao conectar, rc=");
    Serial.println(mqttClient.state());
  }
}

// ===================== SETUP / LOOP =====================

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Pino de gatilho manual
  pinMode(TRIGGER_IN_PIN, INPUT_PULLDOWN);

  // ADC config
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db); // faixa ~0–3.3V

  ds18b20.begin();

  connectWiFi();
  syncTime();

  // MQTT
  setupMqtt();
  ensureMqttConnected();

  Serial.println("Pronto.");
  Serial.println(" - Aplique 3.3 V em GPIO27 (TRIGGER_IN_PIN) para envio manual.");
  Serial.println(" - Ou envie comando MQTT em aquamonitor/esp32-agua-01/command/measure");
}

void loop() {
  // 1) Mantém MQTT conectado e processa mensagens
  ensureMqttConnected();
  mqttClient.loop();

  // 2) Continua aceitando gatilho manual pelo pino 27
  bool triggerState = digitalRead(TRIGGER_IN_PIN) == HIGH;

  // Borda de subida + antirrepique simples (1 s)
  if (triggerState && !lastTriggerState && (millis() - lastSendMs > 1000)) {
    Serial.println("\n[GATILHO MANUAL] Lendo sensores e enviando telemetria...");
    bool ok = sendToFirestore();
    Serial.println(ok ? "[GATILHO MANUAL] Envio concluído.\n"
                      : "[GATILHO MANUAL] Falha no envio.\n");
    lastSendMs = millis();
  }

  lastTriggerState = triggerState;
  delay(20); // varredura leve
}
