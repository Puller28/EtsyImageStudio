#!/bin/bash
export FASTAPI_PORT=8001
cd "$(dirname "$0")"
echo "Starting FastAPI with explicit environment..."
echo "Working directory: $(pwd)"
echo "Python version: $(python --version)"
echo "FASTAPI_PORT: $FASTAPI_PORT"

# Start FastAPI and keep it running
exec python app.py