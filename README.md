# 🐟 Sistema de Monitoramento de Qualidade da Água - Viveiro de Peixes

Sistema mobile desenvolvido em **Ionic React + TypeScript** para monitoramento em tempo real da qualidade da água em viveiros de criação de peixes, com integração ao Firebase/Firestore, chatbot inteligente e controle remoto via MQTT.

---

## 📋 Pré-requisitos

### Node.js

O projeto requer **Node.js versão 16 ou superior**.

**Verificar versão instalada:**

```bash
node -v
npm -v
```

**Instalar/Atualizar Node.js:**

**Linux (Ubuntu/Debian):**

```bash
# Usando NodeSource (recomendado)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Ou usando NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

**Windows:**

- Baixe o instalador em: https://nodejs.org/
- Execute o instalador `.msi` e siga as instruções
- Reinicie o terminal após a instalação

---

## 🚀 Instalação

### 1. Instalar Ionic CLI e Capacitor

**Linux/macOS:**

```bash
sudo npm install -g @ionic/cli @capacitor/core @capacitor/cli
```

**Windows (Execute como Administrador):**

```bash
npm install -g @ionic/cli @capacitor/core @capacitor/cli
```

**Verificar instalação:**

```bash
ionic --version
```

### 2. Clonar/Baixar o Projeto

```bash
# Se estiver em um repositório Git
git clone <url-do-repositorio>
cd <nome-do-projeto>
```

### 3. Instalar Dependências

```bash
npm install
```

---

## 🏃 Executando o Projeto

### Modo Desenvolvimento (Navegador)

```bash
ionic serve
```

O aplicativo abrirá automaticamente em `http://localhost:8100`

### Build para Produção (ainda em andamento)

---

## 📸 Screenshots

Imagem do aplicativo

![Screenshot do App](images/Home-inicial.png)

---

## ⚙️ Configuração do Firebase

O projeto utiliza **Firebase Firestore** para armazenamento e sincronização de dados em tempo real.

### 1. Criar Projeto no Firebase (caso ainda não tenha configurado)

1. Acesse: https://console.firebase.google.com/
2. Clique em "Adicionar projeto"
3. Siga as instruções para criar um novo projeto
4. Ative o **Firestore Database** em modo de teste ou produção

### 2. Obter Credenciais

1. No console do Firebase, vá em **Configurações do Projeto** (ícone de engrenagem)
2. Role até "Seus aplicativos" e clique no ícone **</>** (Web)
3. Registre seu app e copie as credenciais do `firebaseConfig`

### 3. Configurar no Projeto

Edite o arquivo `/services/firestore.ts` e adicione suas credenciais:

```typescript
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID",
};
```

### 4. Estrutura do Firestore

Crie uma coleção chamada `telemetry` com documentos no formato do exemplo:

```json
{
  "version": "1.0.0",
  "msg_type": "telemetry",
  "device_id": "esp32-agua-01",
  "site_id": "fazenda-x_rio-igarape",
  "sent_at": "2025-10-02T10:42:00-03:00",
  "seq": 1235,
  "measurements": [
    {
      "parameter": "pH",
      "value": 7.18,
      "unit": "pH",
      "temp_compensated": true,
      "uncertainty": 0.03,
      "method": "eletrodo_vidro + PH4502C",
      "calibration_id": "cal-2025-09-29-pH-2pts",
      "raw": { "adc": 13211, "voltage_v": 2.41, "temp_c": 25.6, "slope_mV_per_pH": -58.1 }
    },
    {
      "parameter": "temperature",
      "value": 25.6,
      "unit": "°C",
      "method": "DS18B20",
      "raw": { "rom": "28-FFA1B233A1C4", "resolution_bits": 12 }
    },
    {
      "parameter": "turbidity",
      "value": 4.2,
      "unit": "NTU",
      "method": "SEN0189/ST100",
      "raw": { "adc": 9112, "voltage_v": 1.66 }
    },
    {
      "parameter": "tds",
      "value": 320,
      "unit": "ppm",
      "method": "Gravity TDS (k=1.0)",
      "raw": { "adc": 10440, "voltage_v": 1.90, "ec_uS_cm": 640 }
    }
  ],
  "power": { "battery_v": 3.92, "usb_power": false },
  "rssi_dbm": -61,
  "fw": { "app": "safra-dourada-probe", "ver": "0.6.3" }
}
```

---

## 📱 Deploy Mobile (Android/iOS)

### Android

**0. Java 21 (requerido pelo Gradle/Capacitor 7):**

```bash
brew install openjdk@21
echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc
echo 'export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"' >> ~/.zshrc
exec $SHELL
```

**1. Adicionar plataforma Android (somente na primeira vez):**

```bash
ionic capacitor add android
```

**2. Build e sincronizar:**

```bash
ionic build
ionic capacitor sync android
```

**3. Rodar direto no emulador (exemplo):**

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH" \
npx cap run android --target emulator-5556
```

> Altere `emulator-5556` para o ID retornado por `adb devices`.

**4. Abrir no Android Studio (opcional):**

```bash
ionic capacitor open android
```

### iOS (somente macOS)

**1. Adicionar plataforma iOS:**

```bash
ionic capacitor add ios
```

**2. Build e sincronizar:**

```bash
ionic build
ionic capacitor sync ios
```

**3. Abrir no Xcode:**

```bash
ionic capacitor open ios
```

---

## 🎨 Funcionalidades

### ✅ Implementadas

- 📊 **Monitoramento em Tempo Real**: Visualização instantânea dos parâmetros de qualidade da água
- 🔄 **Sincronização Firebase**: Dados atualizados automaticamente via Firestore
- 📈 **Indicadores Visuais**: Barras coloridas mostrando posição dentro da faixa ideal
- 🎯 **Parâmetros Monitorados**:
  - pH (6.5 - 8.5)
  - Temperatura (20°C - 30°C)
  - Turbidez (0 - 10 NTU)
  - Condutividade/TDS (0 - 500 ppm)
- 📱 **Interface Responsiva**: Design otimizado para dispositivos móveis
- ⚡ **Estados de Loading**: Feedback visual durante carregamento e erros
- ♿ **Acessibilidade**: Labels ARIA para leitores de tela
- 📜 **Histórico Avançado**: 
  - Visualização de dados históricos com gráficos de linha
  - Filtros de período (24h, 7 dias, 30 dias)
  - Estatísticas (mínimo, média, máximo)
  - Lista de leituras recentes com status
  - Indicadores de tendência (crescente/decrescente/estável)
- 🤖 **Chatbot Inteligente**:
  - Assistente virtual para dúvidas sobre qualidade da água
  - Sugestões de perguntas pré-definidas
  - Interface de chat intuitiva com balões de mensagem
  - Preparado para integração com LLM (backend)
- 📡 **Controle Remoto via MQTT**:
  - Botão para disparar coleta de dados na ESP32
  - Feedback visual de status (conectando, medindo, sucesso, erro)
  - Comunicação bidirecional com dispositivos IoT

### 🚧 Em Desenvolvimento

- 🔔 **Alertas**: Notificações quando valores saem da faixa ideal
- 🔐 **Autenticação**: Sistema de login e gerenciamento de múltiplos viveiros

---

## 🛠️ Tecnologias Utilizadas

- **[Ionic Framework](https://ionicframework.com/)** - Framework mobile híbrido
- **[React](https://react.dev/)** - Biblioteca JavaScript para interfaces
- **[TypeScript](https://www.typescriptlang.org/)** - Superset tipado de JavaScript
- **[Firebase/Firestore](https://firebase.google.com/)** - Banco de dados em tempo real
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework CSS utilitário
- **[Lucide React](https://lucide.dev/)** - Biblioteca de ícones
- **[Capacitor](https://capacitorjs.com/)** - Runtime nativo para apps híbridos
- **[Recharts](https://recharts.org/)** - Biblioteca de gráficos para React
- **[MQTT](https://mqtt.org/)** - Protocolo de mensageria para IoT
- **[Ollama](https://ollama.com/)** - Execução local de LLMs (IA) para chat/análises inteligentes
- **[Arduino IDE](https://www.arduino.cc/en/software)** - Ambiente de desenvolvimento para firmware embarcado
- **[ESP32](https://www.espressif.com/en/products/socs/esp32)** - Microcontrolador utilizado na coleta de dados dos sensores IoT

---

## 📡 Configuração do MQTT para ESP32

### 1. Instalar biblioteca MQTT (opcional para produção)

```bash
npm install mqtt
```

### 4. Fluxo de Comunicação

1. **Usuário clica** no botão "Coletar" no app
2. **App envia** comando MQTT: `devices/{device_id}/commands`
3. **ESP32 recebe** comando e ativa sensores
4. **ESP32 publica** dados no Firestore
5. **App atualiza** automaticamente via listener do Firestore

---

## 📝 Scripts Disponíveis

```bash
npm install          # Instalar dependências
ionic serve          # Executar em modo desenvolvimento
ionic build          # Build para produção
ionic capacitor add android   # Adicionar plataforma Android
ionic capacitor add ios       # Adicionar plataforma iOS
ionic capacitor sync          # Sincronizar código web com nativo
```

---

## 🎯 Guia de Uso

### Aba Monitor
- Visualize dados em tempo real dos sensores
- Clique no botão "Coletar" flutuante azul (canto inferior direito) para **disparar nova coleta**
- Cada card mostra o valor atual e barra de progresso colorida
- Verde = dentro da faixa ideal | Amarelo/Vermelho = atenção

### Aba Histórico
- Selecione o período: 24h, 7 dias ou 30 dias
- Escolha o parâmetro desejado (pH, Temperatura, etc.)
- Visualize gráfico de tendência e estatísticas
- Role para baixo para ver lista de leituras recentes

### Chatbot Assistente
- Clique no botão de "Chat" (canto inferior direito)
- Digite sua pergunta
- Obtenha respostas sobre qualidade da água
