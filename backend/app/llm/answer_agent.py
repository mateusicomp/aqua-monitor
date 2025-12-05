from typing import Any, Dict, Optional
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.config import get_settings
from app.llm.prompts import load_water_prompt
from app.models import QueryIntent


settings = get_settings()

def build_answer_chain():
    system_template = """
{water_prompt}

Você receberá:
- a pergunta original do usuário,
- a intenção interpretada (QueryIntent),
- um resumo dos dados consultados no Firestore.

Explique em até 3 parágrafos curtos, em português do Brasil, de forma empática.
Use unidades (pH, °C, NTU, ppm) e explique se os valores são adequados ou exigem atenção.
Se não houver dados, diga isso claramente.
"""

    human_template = """
Pergunta do usuário:
{user_question}

Intenção interpretada:
{intent_json}

Resumo dos dados:
{data_summary}
"""

    prompt = ChatPromptTemplate.from_messages(
        [("system", system_template), ("human", human_template)]
    )

    llm = ChatOllama(
        model=settings.OLLAMA_MODEL_NAME,
        base_url=settings.OLLAMA_BASE_URL,
        temperature=0.4,
    )

    return prompt | llm | StrOutputParser()

_answer_chain = build_answer_chain()

def generate_answer(
    user_question: str,
    intent: QueryIntent,
    data_summary: Optional[Dict[str, Any]],
) -> str:
    water_prompt = load_water_prompt()
    return _answer_chain.invoke(
        {
            "water_prompt": water_prompt,
            "user_question": user_question,
            "intent_json": intent.model_dump(),
            "data_summary": data_summary or {"info": "nenhum dado encontrado"},
        }
    )
