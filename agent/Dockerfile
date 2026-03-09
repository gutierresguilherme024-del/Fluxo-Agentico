# ==============================================================================
# Production Dockerfile for Railway - Simplified & Robust
# ==============================================================================
FROM python:3.12-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    HOME=/app

WORKDIR /app

# Install runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    curl \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy only requirements first to leverage caching
COPY agent/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
# Since build context is repo root, we prefix with agent/
COPY agent/main.py agent/config.py agent/graph.py agent/memory.py agent/tools.py ./
COPY agent/voice/ ./voice/

# Create empty chroma_db directory with permissions
RUN mkdir -p /app/chroma_db && chmod 777 /app/chroma_db

# Railway provides PORT env var. Fallback to 8080 for testing.
ENV PORT=8080

# Use python -m uvicorn for better module resolution
# Shell form to enable $PORT expansion
CMD python -m uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1 --log-level info
