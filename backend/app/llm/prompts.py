from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent

def load_water_prompt() -> str:
    return (BASE_DIR / "prompt_water_assistant.txt").read_text(encoding="utf-8")
