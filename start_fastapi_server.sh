#!/bin/bash
# FastAPI Single Server Startup Script
# Following user specification: uvicorn app:app --host 0.0.0.0 --port $PORT --workers 1 --no-access-log

echo "🚀 Starting FastAPI Single Server..."
echo "📋 Configuration:"
echo "   PORT: ${PORT:-8000}"
echo "   MOCK_MODE: ${MOCK_MODE:-false}"
echo "   RunPod API Key: $([ -n "$RUNPOD_API_KEY" ] && echo "✅ Present" || echo "❌ Missing")"
echo "   RunPod Endpoint: $([ -n "$RUNPOD_ENDPOINT_BASE" ] && echo "✅ Present" || echo "❌ Missing")"
echo ""

# Use PORT from environment, default to 8000
export PORT=${PORT:-8000}
export MOCK_MODE=${MOCK_MODE:-false}

echo "🔧 Starting with exact user specification:"
echo "   uvicorn app:app --host 0.0.0.0 --port $PORT --workers 1 --no-access-log"
echo ""

# Start the FastAPI server with exact user specification
exec uvicorn app:app --host 0.0.0.0 --port $PORT --workers 1 --no-access-log