from dotenv import load_dotenv
import os

load_dotenv(dotenv_path="../.env")

# LLM (Prioridade: Anthropic)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()

# Fallback (NVIDIA/GLM)
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", os.getenv("VITE_NVIDIA_API_KEY", "")).strip()
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", os.getenv("VITE_NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")).strip()
LLM_MODEL = os.getenv("LLM_MODEL", os.getenv("VITE_LLM_MODEL", "z-ai/glm4.7")).strip()

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_ANON_KEY", "")).strip()

# ChromaDB
CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db").strip()

# Servidor
PORT = int(os.getenv("PORT", os.getenv("AGENT_PORT", "8000")))
HOST = os.getenv("HOST", os.getenv("AGENT_HOST", "0.0.0.0"))
