import mqtt, { MqttClient, IClientOptions } from "mqtt";


export type MeasureStatus = "idle" | "connecting" | "measuring" | "success" | "error";

const BROKER_URL = import.meta.env.VITE_BROKER_URL;

// Se precisar de auth (HiveMQ Cloud, etc), preenche aqui
const MQTT_USERNAME = "";
const MQTT_PASSWORD = "";

const options: IClientOptions = {
  connectTimeout: 4000,
  clientId: "aquamonitor_web_" + Math.random().toString(16).substr(2, 8),
  username: MQTT_USERNAME || undefined,
  password: MQTT_PASSWORD || undefined,
  reconnectPeriod: 4000, // tenta reconectar automaticamente a cada 4s
  keepalive: 30,
};

let client: MqttClient | null = null;
let connectingPromise: Promise<MqttClient> | null = null;

async function getMqttClient(): Promise<MqttClient> {
  // já temos um cliente conectado?
  if (client && client.connected) {
    return client;
  }

  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = new Promise<MqttClient>((resolve, reject) => {
    console.log("[MQTT] Conectando em:", BROKER_URL);
    const c = mqtt.connect(BROKER_URL, options);
    client = c;

    const timeoutId = setTimeout(() => {
      console.error("[MQTT] Timeout ao conectar no broker");
      try {
        c.end(true);
      } catch {}
      connectingPromise = null;
      reject(new Error("Timeout ao conectar ao broker MQTT"));
    }, 7000);

    c.on("connect", () => {
      clearTimeout(timeoutId);
      console.log("[MQTT] Conectado ao broker");
      connectingPromise = null;
      resolve(c);
    });

    c.on("error", (err) => {
      clearTimeout(timeoutId);
      console.error("[MQTT] Erro na conexão:", err);
      try {
        c.end(true);
      } catch {}
      connectingPromise = null;
      reject(err);
    });
  });

  return connectingPromise;
}

// Envia comando de medida para o ESP32
export const sendMeasureCommand = async (deviceId: string): Promise<void> => {
  const c = await getMqttClient();

  const topic = `aquamonitor/${deviceId}/command/measure`;
  const payload = JSON.stringify({
    deviceId,
    action: "measure",
    source: "web",
    ts: new Date().toISOString(),
  });

  return new Promise<void>((resolve, reject) => {
    c.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        console.error("[MQTT] Erro ao publicar comando:", err);
        reject(new Error("Falha ao enviar comando MQTT"));
      } else {
        console.log("[MQTT] Comando publicado em", topic, "=>", payload);
        resolve();
      }
    });
  });
};

// Por enquanto, só checa se estamos conectados ao broker
export const checkDeviceStatus = async (_deviceId: string): Promise<boolean> => {
  try {
    const c = await getMqttClient();
    return c.connected;
  } catch {
    return false;
  }
};
