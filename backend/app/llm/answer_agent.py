from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.config import get_settings
from app.llm.prompts import load_water_prompt

settings = get_settings()


def build_general_help_chain():
    system_template = """
{water_prompt}

Você é um assistente técnico e simpático.
Responda sempre em PT-BR, em no máximo 4 linhas.
Se a pessoa só cumprimentar, se apresente e diga exemplos do que você consegue responder
(pH, temperatura, turbidez, TDS, histórico, tendência, máximos/mínimos).

Não inclua JSON, nem "resumo dos dados".
"""

    prompt = ChatPromptTemplate.from_messages(
        [("system", system_template), ("human", "{user_question}")]
    )

    llm = ChatOllama(
        model=settings.OLLAMA_MODEL_NAME,
        base_url=settings.OLLAMA_BASE_URL,
        temperature=0.2,
    )

    return prompt | llm | StrOutputParser()


_general_help_chain = build_general_help_chain()


def generate_general_help_answer(user_question: str) -> str:
    water_prompt = load_water_prompt()
    return _general_help_chain.invoke(
        {"water_prompt": water_prompt, "user_question": user_question}
    )
