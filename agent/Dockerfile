# ==============================================================================
# Production Dockerfile for Railway - Agent Directory
# ==============================================================================
FROM python:3.12-slim

# Set environment variables
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
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Install python dependencies first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -U pip && \
    pip install --no-cache-dir -r requirements.txt && \
    # Fix for chromadb sqlite version issues on linux slim images
    pip install --no-cache-dir pysqlite3-binary

# Copy application code with correct ownership
COPY --chown=appuser:appuser main.py config.py graph.py memory.py tools.py ./
COPY --chown=appuser:appuser voice/ ./voice/

# Create empty chroma_db directory with full permissions for the app
RUN mkdir -p /app/chroma_db && chown -R appuser:appuser /app/chroma_db && chmod -R 777 /app/chroma_db

# Switch to non-root user
USER appuser

# Railway provides PORT env var. 
# CRITICAL: Match Railway Networking settings (8000).
# Using explicitly 8000 as fallback.
CMD ["/bin/sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --log-level info"]
