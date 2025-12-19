from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate

from app.config import get_settings
from app.llm.prompts import load_water_prompt
from app.models import QueryIntent

settings = get_settings()


def build_intent_chain():
    system_prompt = """
{water_prompt}

Você vai classificar a pergunta do usuário e retornar APENAS um JSON compatível com QueryIntent.

INTENTS (escolha UM):
- general_help:
  - cumprimentos, "quem é você", "o que você faz", "como usar", "o que é turbidez/tds/ph"
  - IMPORTANTE: se for general_help, NÃO coloque start/end/days e NÃO coloque parameter.

- latest_status:
  - "qual a última leitura?" / "última temperatura" / "último pH" / "como está agora"
  - parameter: se citar um parâmetro (temperatura, ph, turbidez, tds), preencha.
  - se pedir geral ("como está a água agora"), pode deixar parameter vazio.

- max_value:
  - "qual foi o pH mais alto", "maior turbidez", "pico de temperatura"
  - parameter obrigatório

- min_value:
  - "qual foi o menor pH", "menor temperatura"
  - parameter obrigatório

- avg_value:
  - "qual foi o pH médio", "média de turbidez"
  - parameter obrigatório

- period_status:
  - "como foi o pH ontem", "como esteve a água de 8h a 10h", "resumo das últimas 24h"
  - parameter opcional (se não citar, é resumo geral)

- trend:
  - "tende a aumentar/diminuir", "está subindo ou descendo", "tendência nos últimos dias"
  - parameter obrigatório (se citar)
  - se o usuário disser "últimos X dias", preencha days=X

- ideal_check:
  - "está dentro do ideal?", "está ok?", "está na faixa recomendada?"
  - parameter obrigatório (se citar)

- compare_periods:
  - "compare hoje vs ontem", "essa semana vs semana passada"
  - parameter recomendado

REGRAS DE OURO (não quebre):
1) NÃO invente datas.
   - Só preencha start/end se o usuário der um período claro (ex: "entre 8 e 10", "de 01/12 a 03/12").
   - Se o usuário disser "últimos X dias", use days=X e deixe start/end vazios.
2) Se não tiver certeza, prefira:
   - general_help (se for conceitual) ou
   - latest_status (se parecer pergunta de agora).
3) Normalize parâmetros:
   - pH -> ph
   - temperatura -> temperature
   - turbidez -> turbidity
   - condutividade/tds -> tds

Retorne APENAS o JSON.
"""

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system_prompt),
            ("human", "{user_question}"),
        ]
    )

    llm = ChatOllama(
        model=settings.OLLAMA_MODEL_NAME,
        base_url=settings.OLLAMA_BASE_URL,
        temperature=0.0,  # mais determinístico
    )

    chain = prompt | llm.with_structured_output(QueryIntent)
    return chain


_intent_chain = build_intent_chain()


def classify_intent(user_question: str) -> QueryIntent:
    water_prompt = load_water_prompt()
    return _intent_chain.invoke(
        {"user_question": user_question, "water_prompt": water_prompt}
    )
