/**
 * Serviço MQTT para comunicação com ESP32
 * 
 * Este serviço permite enviar comandos para o dispositivo ESP32
 * para disparar coleta de dados dos sensores de qualidade da água.
 * 
 * IMPORTANTE: Este é um stub/mock. Para implementação real:
 * 1. Instale o cliente MQTT: npm install mqtt
 * 2. Configure o broker MQTT (ex: HiveMQ, Mosquitto, AWS IoT)
 * 3. Implemente a conexão real substituindo as funções abaixo
 */

export interface MqttConfig {
  brokerUrl: string;
  username?: string;
  password?: string;
  clientId: string;
}

export interface MeasureCommand {
  device_id: string;
  command: 'measure';
  timestamp: string;
}

export type MeasureStatus = 'idle' | 'connecting' | 'measuring' | 'success' | 'error';

// Mock de configuração - substituir com valores reais
const MOCK_CONFIG: MqttConfig = {
  brokerUrl: 'wss://broker.hivemq.com:8884/mqtt', // Exemplo de broker público
  clientId: `web-client-${Math.random().toString(16).substr(2, 8)}`
};

/**
 * Simula o envio de comando MQTT para o dispositivo
 * 
 * IMPLEMENTAÇÃO REAL:
 * 
 * import mqtt from 'mqtt';
 * 
 * export const sendMeasureCommand = async (deviceId: string): Promise<void> => {
 *   const client = mqtt.connect(MQTT_CONFIG.brokerUrl, {
 *     username: MQTT_CONFIG.username,
 *     password: MQTT_CONFIG.password,
 *     clientId: MQTT_CONFIG.clientId
 *   });
 * 
 *   return new Promise((resolve, reject) => {
 *     client.on('connect', () => {
 *       const topic = `devices/${deviceId}/commands`;
 *       const payload: MeasureCommand = {
 *         device_id: deviceId,
 *         command: 'measure',
 *         timestamp: new Date().toISOString()
 *       };
 *       
 *       client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
 *         client.end();
 *         if (err) reject(err);
 *         else resolve();
 *       });
 *     });
 * 
 *     client.on('error', (err) => {
 *       client.end();
 *       reject(err);
 *     });
 *   });
 * };
 */

export const sendMeasureCommand = async (deviceId: string): Promise<void> => {
  // Mock: simula delay de rede
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock: simula 90% de sucesso
  if (Math.random() > 0.1) {
    console.log(`[MQTT Mock] Comando enviado para ${deviceId}:`, {
      command: 'measure',
      timestamp: new Date().toISOString(),
      topic: `devices/${deviceId}/commands`
    });
    return Promise.resolve();
  } else {
    throw new Error('Falha ao conectar com o dispositivo');
  }
};

/**
 * Verifica se o dispositivo está online
 * 
 * IMPLEMENTAÇÃO REAL: verificar last will/testament ou heartbeat do MQTT
 */
export const checkDeviceStatus = async (deviceId: string): Promise<boolean> => {
  // Mock: sempre retorna online
  await new Promise(resolve => setTimeout(resolve, 500));
  return true;
};
