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

# Create empty chroma_db directory (runtime will populate)
RUN mkdir -p /app/chroma_db && chown appuser:appuser /app/chroma_db

# Switch to non-root user for security
USER appuser

# Run application (shell form to expand $PORT)
CMD ["/bin/sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --log-level info"]
