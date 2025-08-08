
## FastAPI Single Server Implementation

The application now uses a unified FastAPI architecture that replaces the previous dual-server setup:

### Key Features:
- **Health Endpoints**: /healthz (quick), / (root), /status (detailed)
- **Async Architecture**: Non-blocking RunPod operations using asyncio.create_task()
- **Retry Logic**: Exponential backoff for 502/503/504 errors with max retries
- **MOCK_MODE**: Development mode that returns fake data when RunPod is unavailable
- **Production Ready**: Follows Replit deployment specification exactly

### Usage:
```bash
# Production deployment
PORT=5000 uvicorn app:app --host 0.0.0.0 --port $PORT --workers 1 --no-access-log

# Development with mock mode
MOCK_MODE=true PORT=8000 python app.py
```

### Endpoints:
- `GET /healthz` - Fast health check (no external calls)
- `GET /` - Root endpoint returning 'ok'
- `GET /status` - Detailed status with RunPod connectivity
- `POST /generate` - Single artwork mockup generation
- `POST /batch` - Batch processing with multiple room presets

All endpoints use async/await patterns and include comprehensive error handling.

