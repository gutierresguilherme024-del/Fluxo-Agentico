# ==============================================================================
# Railway Production Dockerfile - Root Level (VERSÃO MELHORADA)
# ==============================================================================
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

WORKDIR /app

# Dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 curl gcc python3-dev sqlite3 \
    && rm -rf /var/lib/apt/lists/* && apt-get clean

# Usuário não-root (segurança)
RUN useradd -m -u 1000 appuser

# Requirements
COPY agent/requirements.txt .
RUN pip install --no-cache-dir -U pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir pysqlite3-binary

# === COPIA TODO O CÓDIGO DO AGENT (isso resolve 99% dos 502 agora) ===
COPY agent/ ./

# Pasta do banco Chroma
RUN mkdir -p /app/chroma_db && \
    chown -R appuser:appuser /app && \
    chmod -R 777 /app/chroma_db

USER appuser

# Start (usa a variável PORT que o Railway injeta)
CMD ["sh", "-c", "echo \"[STARTUP] PORT=${PORT:-8000}\" && python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --log-level info"]
