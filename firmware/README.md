## 🛠️ Montagem do Hardware – Sensores e ESP32

> **🔧 OBS:** Este guia descreve *exatamente* a montagem utilizada no projeto funcional. Há espaços reservados para inserir fotos futuramente.

---

## 📌 1. Visão Geral da Arquitetura Física

O sistema utiliza uma ESP32 como unidade central, recebendo dados de quatro entradas principais:

1. **Sensor de Temperatura DS18B20 (OneWire – digital)**
2. **Sensor de pH PH4502C (analógico)**
3. **Sensor de Turbidez SEN0189 (analógico)**
4. **Sensor de Condutividade/TDS Gravity (analógico)**
5. **Chave/Gatilho para iniciar medição manual (digital GPIO27)**

Cada um dos sensores é alimentado e conectado conforme especificações seguras para o ESP32.

> **📸 Espaço para imagem do setup geral**

---

# 📍 2. Montagem dos Sensores

---

## 🔵 2.1. DS18B20 — Temperatura (Digital OneWire)

### 📌 Ligações (exatamente como usado no projeto)

* **VCC → 3.3V** da ESP32
* **GND → GND**
* **DATA → GPIO 4**
* **Pull-up obrigatório:** resistor **4.7kΩ** entre **DATA** e **3.3V**

### 📐 Observações importantes

* O sensor funciona tanto com 3.3V quanto 5V, mas **recomendamos 3.3V** para reduzir ruído.
* O DS18B20 é responsável por fornecer a temperatura usada para compensação térmica do TDS.

> **📸 Espaço para foto da conexão do DS18B20**

---

## 🟢 2.2. Sensor de pH – PH4502C

### 📌 Ligações

* **VCC → 5V**
* **GND → GND comum**
* **PO (saída analógica) → GPIO 34** da ESP32

### ⚠️ Atenção sobre tensão na saída PO

* A placa **PH4502C já limita a tensão de saída**.
* Valores típicos variam entre **~2.5V (pH neutro)** até **~3.0V (ácido)**.
* Seguro para o ADC da ESP32 (0–3.3V).

### 🔧 Ajuste obrigatório do módulo

Com a sonda mergulhada na solução tampão **pH 7**:

1. Gire o potenciômetro azul da placa PH4502C.
2. Ajuste até a leitura analógica ficar estável.
3. O firmware usa duas constantes para calibrar:

   * `PH7_VOLTAGE`
   * `PH4_VOLTAGE`

> **📸 Espaço para foto do sensor PH4502C com destaque nos potenciômetros**

---

## 🟤 2.3. Sensor de Turbidez – SEN0189

### 📌 Ligações

* **VCC → 5V**
* **GND → GND**
* **A0 (saída analógica) → GPIO 35**

### Observações

* O módulo já entrega saída ajustada para 0–4.5V, mas o firmware assume faixa **0–3.3V**.
* Valores típicos de água limpa ficam próximos de **2.5V**.

> **📸 Espaço para foto da turbidez ligada na ESP32**

---

## 🟣 2.4. Sensor de Condutividade/TDS – Gravity TDS Meter

### 📌 Ligações

* **VCC → 5V**
* **GND → GND**
* **A0 (saída analógica) → GPIO 32**

### Observações

* Precisa de compensação térmica → Uso obrigatório da temperatura do DS18B20.
* Fórmula incorporada no firmware:

```
EC = 133.42*V³ − 255.86*V² + 857.39*V
EC25 = EC / (1 + 0.02*(Temp − 25))
TDS = EC25 * 0.5
```

> **📸 Espaço para foto do módulo Gravity TDS**

---

# 🔘 3. Chave/Gatilho de Coleta – GPIO27

Este pino permite disparar uma medição manual.

### 📌 Ligações

* Um botão ou chave **que aplica 3.3V ao GPIO27**.
* O pino foi configurado como **INPUT_PULLDOWN** no firmware.

### Funcionamento

* Quando **GPIO27 recebe 3.3V**, a ESP32 executa:

  * Leitura de todos os sensores
  * Montagem do JSON
  * Envio ao Firestore

> **📸 Espaço para foto do botão/gatilho**

---

# 🔗 4. Diagrama de Ligações (Resumo Rápido)

| Sensor / Componente    | VCC  | GND | Sinal → ESP32                   |
| ---------------------- | ---- | --- | ------------------------------- |
| **DS18B20**            | 3.3V | GND | GPIO 4 + resistor 4.7kΩ pull-up |
| **PH4502C**            | 5V   | GND | GPIO 34                         |
| **SEN0189 (Turbidez)** | 5V   | GND | GPIO 35                         |
| **TDS Gravity**        | 5V   | GND | GPIO 32                         |
| **Botão Gatilho**      | 3.3V | —   | GPIO 27                         |

> **📸 Espaço para foto do diagrama geral montado**

---

# ⚠️ 5. Recomendações Importantes

* Sempre usar **GND comum** para todos os módulos.
* Evitar cabos longos em sensores analógicos.
* Ler os sensores **com média de 30 amostras**, como feito no firmware.
* Manter o TDS e o pH afastados fisicamente para evitar interferência.
* A sonda de turbidez deve ficar bem fixa, sem bolhas.

---

# 🧪 6. Primeiros Testes Práticos

1. Alimentar todo o circuito.
2. Verificar tensões:

   * PH4502C: **2.5–3.0V** no PO
   * Turbidez: **2.5V** (água limpa)
   * TDS: depende da solução
3. Conectar monitor serial da ESP32.
4. Pressionar o gatilho.
5. Confirmar que os dados aparecem no Firestore.

> **📸 Espaço para foto dos valores no serial monitor**

---

Pronto — este é o documento completo da montagem do hardware, seguindo os padrões do seu README principal. Você agora só precisa me dizer **entre quais seções do README.md existente deseja incluir este conteúdo**.
