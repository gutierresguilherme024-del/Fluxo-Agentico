from dotenv import load_dotenv
import os

load_dotenv(dotenv_path="../.env")

# LLM (usando NVIDIA/GLM que já está configurado)
NVIDIA_API_KEY = os.getenv("VITE_NVIDIA_API_KEY", "")
NVIDIA_BASE_URL = os.getenv("VITE_NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
LLM_MODEL = os.getenv("VITE_LLM_MODEL", "z-ai/glm4.7")

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_ANON_KEY", ""))

# Claude (opcional, se disponível)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# ChromaDB
CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db")

# Servidor
PORT = int(os.getenv("AGENT_PORT", "8000"))
HOST = os.getenv("AGENT_HOST", "0.0.0.0")
