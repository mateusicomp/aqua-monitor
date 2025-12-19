# Backend Chat – AquaMonitor

Este diretório contém o **backend do Assistente Inteligente (chatbot). O backend é responsável por interpretar perguntas do usuário sobre **qualidade da água**, consultar dados de **telemetria no Firestore** e retornar respostas claras e objetivas.

O sistema foi projetado para funcionar com um **modelo de linguagem pequeno (LLM local)**, priorizando **baixo custo computacional, controle total da lógica e confiabilidade dos resultados**.

---

## Visão Geral da Arquitetura

* **FastAPI (Python)**: API principal do chatbot.
* **LLM local via Ollama (qwen2:0.5b)**: usada para interpretar a intenção das perguntas e gerar respostas humanizadas.
* **Firestore (Firebase)**: base de dados onde ficam armazenadas as leituras de telemetria (pH, temperatura, turbidez, TDS).
* **Lógica determinística no backend**:

  * A LLM **não calcula valores**.
  * Todas as médias, máximos, mínimos e tendências são calculadas pelo backend.
  * A LLM apenas entende a pergunta e ajuda a formular a resposta final.

---

## Por que usar um modelo de LLM pequeno?

O modelo utilizado neste projeto (**qwen2:0.5b**) é considerado um **modelo de pequeno porte**. Isso significa que:

* Ele consome pouca memória RAM (compatível com notebooks comuns).
* Pode rodar **localmente**, sem dependência de serviços pagos ou conexão constante com a internet.
* Possui **menor capacidade de generalização** quando comparado a modelos grandes (como GPT-4 ou Gemini).

Por esse motivo, o chatbot **não é genérico**. Ele foi **especializado** para o domínio do projeto (qualidade da água), com:

* Perguntas bem definidas.
* Intenções claras (última leitura, máximo, mínimo, média, tendência, faixa ideal).
* Respostas curtas e objetivas.

Em uma solução com modelos maiores (ex.: OpenAI), seria possível responder perguntas sobre diversos assuntos. Neste projeto, a escolha do modelo pequeno foi **intencional**, priorizando:

* Especialização no domínio.
* Previsibilidade das respostas.
* Menor custo e maior controle da aplicação.

---

## Estrutura do Diretório

```text
backend/
│
├── app/
│   ├── main.py                 # Endpoint /chat e orquestração geral
│   ├── config.py               # Configurações via variáveis de ambiente
│   ├── models.py               # Modelos Pydantic e tipos de intenções
│   ├── firestore_client.py     # Conexão com o Firestore
│   ├── telemetry_repository.py # Consultas e cálculos sobre telemetria
│   │
│   └── llm/
│       ├── intent_agent.py     # Interpretação de intenção da pergunta
│       ├── answer_agent.py     # Respostas para ajuda geral
│       ├── prompts.py          # Loader de prompts
│       └── prompt_water_assistant.txt
│
├── requirements.txt            # Dependências Python
├── .env                        # Variáveis de ambiente (não versionar)
└── README.md                   # Este arquivo
```

---

## Pré-requisitos

Antes de iniciar, certifique-se de ter instalado:

* **Python 3.10+**
* **pip**
* **Git**
* **Ollama** (para rodar a LLM local)

---

## 1. Clonando o Repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd aqua-monitor/backend
```

---

## 2. Criando o Ambiente Virtual (venv)

```bash
python -m venv venv
source venv/bin/activate   # Linux / macOS
# ou
venv\\Scripts\\activate      # Windows
```

---

## 3. Instalando Dependências Python

```bash
pip install -r requirements.txt
```

---

## 4. Instalando e Configurando a LLM (Ollama)

### 4.1. Instalar o Ollama

Acesse:

👉 [https://ollama.com](https://ollama.com)

E siga as instruções para seu sistema operacional.

### 4.2. Baixar o modelo utilizado

```bash
ollama pull qwen2:0.5b
```

### 4.3. Verificar se o Ollama está rodando

```bash
ollama list
```

O serviço do Ollama roda, por padrão, em:

```text
http://localhost:11434
```

---

## 5. Configuração do Firestore (Firebase)

### 5.1. Criar credenciais no Firebase

1. Acesse o **Firebase Console**.
2. Vá em **Configurações do Projeto → Contas de Serviço**.
3. Clique em **Gerar nova chave privada**.
4. Baixe o arquivo JSON.

### 5.2. Salvar o JSON no projeto

Coloque o arquivo em um local seguro, por exemplo:

```text
backend/tcc-firebase-admin.json
```

### 5.3. Configurar variáveis de ambiente

Crie um arquivo `.env` no diretório `backend/`:

```env
# Caminho do JSON de credenciais do Firebase/Firestore
GOOGLE_APPLICATION_CREDENTIALS=/home/mateus/Projetos/aqua-monitor/backend/tcc-firebase-admin.json

# ID do projeto Firestore
FIRESTORE_PROJECT_ID=monitor-viveiro

# Nome da coleção de telemetria
FIRESTORE_TELEMETRY_COLLECTION=telemetry

# Configuração do Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL_NAME=qwen2:0.5b
```

> ⚠️ **Nunca versionar o arquivo `.env` nem o JSON de credenciais.**

---

## 6. Executando o Backend

```bash
uvicorn app.main:app --reload
```

A API ficará disponível em:

```text
http://127.0.0.1:8000
```

Documentação interativa:

```text
http://127.0.0.1:8000/docs
```

---

## 7. Endpoint Principal

### POST `/chat`

Exemplo de requisição:

```json
{
  "session_id": "123",
  "message": "Qual foi a última temperatura aferida?",
  "device_id": "esp32-agua-01",
  "site_id": "fazenda-x_rio-igarape"
}
```

O backend interpreta a pergunta, consulta o Firestore e retorna uma resposta curta e objetiva.

---

## Considerações Finais

Este backend foi projetado para:

* Ser **especialista em qualidade da água**.
* Trabalhar com **LLMs pequenas**, de forma eficiente.
* Garantir **confiabilidade**, evitando que o modelo invente dados.

Essa abordagem é ideal para projetos acadêmicos, sistemas embarcados, IoT e aplicações onde **controle e previsibilidade** são mais importantes que generalidade.
