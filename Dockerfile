# ==============================================================================
# Railway Production Dockerfile - Root Level Wrapper
# ==============================================================================
# This Dockerfile is placed at repository root to satisfy Railway's requirement
# while maintaining the actual application code in the agent/ subdirectory.
# ==============================================================================

FROM python:3.12-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    curl \
    gcc \
    python3-dev \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Copy requirements from agent subdirectory
COPY agent/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -U pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir pysqlite3-binary

# Copy application code from agent subdirectory
COPY --chown=appuser:appuser agent/main.py agent/config.py agent/graph.py agent/memory.py agent/tools.py ./
COPY --chown=appuser:appuser agent/voice/ ./voice/

# Create empty chroma_db directory
RUN mkdir -p /app/chroma_db && \
    chown -R appuser:appuser /app/chroma_db && \
    chmod -R 777 /app/chroma_db

# Switch to non-root user
USER appuser

# Railway provides PORT env var.
# Explicitly set PORT with fallback, then use consistently.
CMD ["/bin/sh", "-c", "PORT=${PORT:-8000} && echo \"[STARTUP] PORT=$PORT\" && python -m uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1 --log-level info"]
