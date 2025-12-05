from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from app.config import get_settings
from app.llm.prompts import load_water_prompt
from app.models import QueryIntent, QueryIntentType, WaterParameter


settings = get_settings()

def build_intent_chain():
    system_prompt = """
{water_prompt}

Sua tarefa é interpretar a intenção da PERGUNTA do usuário
e preencher o objeto QueryIntent com:

- intent: um dos valores:
    - latest_status
    - period_status
    - trend
    - general_help

- parameter: se a pergunta mencionar pH, temperatura, turbidez ou TDS,
  normalize para "ph", "temperature", "turbidity" ou "tds".
  Caso não seja sobre um parâmetro específico, deixe vazio.

- start, end: se o usuário mencionar um período (ontem, hoje de manhã,
  entre 8h e 10h), converta para ISO 8601 sempre que possível.
  Se não for claro, deixe vazio.

- aggregation: use "avg", "min_max", "summary" ou "raw" se fizer sentido.

Regras importantes:

- Se a pergunta for apenas um cumprimento ("oi", "olá", "bom dia") ou
  uma pergunta como "quem é você?", "o que você faz?",
  então SEMPRE use intent = "general_help" e deixe todos os outros campos vazios.

- Use as intenções:
    latest_status  -> situação atual das leituras
    period_status  -> período específico (ontem, hoje de manhã, entre X e Y)
    trend          -> se algum parâmetro está subindo/descendo
    general_help   -> explicações gerais, apresentação do bot, etc.

Responda SOMENTE com JSON compatível com QueryIntent.
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
        temperature=0.1,
    )

    # structured output com Pydantic
    chain = prompt | llm.with_structured_output(QueryIntent)
    return chain

_intent_chain = build_intent_chain()

def classify_intent(user_question: str) -> QueryIntent:
    water_prompt = load_water_prompt()
    return _intent_chain.invoke(
        {"user_question": user_question, "water_prompt": water_prompt}
    )
