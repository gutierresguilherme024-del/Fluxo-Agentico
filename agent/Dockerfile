# ==============================================================================
# Production Dockerfile for Railway - Maximum Compatibility
# ==============================================================================
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install system dependencies + sqlite fix
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    curl \
    gcc \
    python3-dev \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY agent/requirements.txt .
RUN pip install --no-cache-dir -U pip && \
    pip install --no-cache-dir -r requirements.txt && \
    # Fix for chromadb sqlite version issues on slim images
    pip install --no-cache-dir pysqlite3-binary

# Copy code
COPY agent/main.py agent/config.py agent/graph.py agent/memory.py agent/tools.py ./
COPY agent/voice/ ./voice/

# Ensure directory permissions for chromadb
RUN mkdir -p /app/chroma_db && chmod 777 /app/chroma_db

# Railway provides PORT. We use a fallback just in case.
# IMPORTANT: Use shell form for CMD to ensure $PORT is expanded!
CMD ["/bin/sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1 --log-level info"]
