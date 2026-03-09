# ==============================================================================
# STAGE 1: Builder - Instala dependências Python
# ==============================================================================
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
# Railway context = repo root, so paths are relative to root
COPY agent/requirements.txt .
RUN pip install --user --no-cache-dir --no-warn-script-location -r requirements.txt

# ==============================================================================
# STAGE 2: Runtime - Container final otimizado
# ==============================================================================
FROM python:3.12-slim

WORKDIR /app

# Install runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Copy Python dependencies from builder
COPY --from=builder --chown=appuser:appuser /root/.local /home/appuser/.local

# Copy application code (Railway context = repo root)
COPY --chown=appuser:appuser agent/main.py agent/config.py agent/graph.py agent/memory.py agent/tools.py ./
COPY --chown=appuser:appuser agent/voice/ ./voice/

# Create empty chroma_db directory (runtime will populate)
RUN mkdir -p chroma_db && chown appuser:appuser chroma_db

# Set environment variables
ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

# Switch to non-root user
USER appuser

# Run application (shell form to expand $PORT)
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --log-level info
