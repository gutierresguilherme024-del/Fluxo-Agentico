import os
from dotenv import load_dotenv

load_dotenv()

def _is_placeholder_secret(value: str) -> bool:
    normalized = value.strip().strip('"').strip("'").lower()
    if not normalized:
        return True
    placeholders = {
        "#",
        "***",
        "changeme",
        "change-me",
        "your_key_here",
        "your-api-key",
        "none",
        "null",
        "undefined",
        "false",
        "0",
    }
    return normalized in placeholders

def get_env_flexible(primary_key, fallbacks=[]):
    keys = [primary_key] + fallbacks
    for k in keys:
        val = os.getenv(k, "").strip()
        if val and not _is_placeholder_secret(val):
            print(f"[CONFIG] Chave encontrada usando o nome: {k}")
            return val
    return ""

# LLM (Scanner Flexível)
ANTHROPIC_API_KEY = get_env_flexible("ANTHROPIC_API_KEY", ["ANTHROPIC_KEY", "CLAUDE_API_KEY", "CLAUDE_KEY"])
NVIDIA_API_KEY = get_env_flexible("NVIDIA_API_KEY", ["VITE_NVIDIA_API_KEY", "NVIDIA_KEY", "GLM_KEY"])
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", os.getenv("VITE_NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")).strip()
LLM_MODEL = os.getenv("LLM_MODEL", os.getenv("VITE_LLM_MODEL", "z-ai/glm4.7")).strip()

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_ANON_KEY", "")).strip()

# ChromaDB
CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db").strip()
CHROMA_INITIALIZATION_TIMEOUT = int(os.getenv("CHROMA_TIMEOUT", "30"))

# Servidor
PORT = int(os.getenv("PORT", os.getenv("AGENT_PORT", "8000")))
HOST = os.getenv("HOST", os.getenv("AGENT_HOST", "0.0.0.0"))
