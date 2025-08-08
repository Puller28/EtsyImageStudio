# FastAPI Single Server Testing Guide

## Quick Test (30 seconds)

1. **Start the server in mock mode:**
   ```bash
   PORT=8000 MOCK_MODE=true ./start_fastapi_server.sh
   ```
   
2. **In another terminal, test endpoints:**
   ```bash
   PORT=8000 python test_fastapi_endpoints.py
   ```

## Manual Testing

### Health Check (should respond in <100ms)
```bash
curl -w "Response time: %{time_total}s\n" http://localhost:8000/healthz
# Expected: {"ok": true}
```

### Root Endpoint (for Replit probes)
```bash
curl http://localhost:8000/
# Expected: ok
```

### Detailed Status
```bash
curl http://localhost:8000/status | python -m json.tool
# Expected: JSON with fastapi_running: true, mock_mode: true/false, etc.
```

### Generate Mockup (Mock Mode)
```bash
curl -X POST http://localhost:8000/generate \
  -F "file=@coffee_fit_test2.jpg" \
  -F "prompt=Modern bedroom with framed artwork" \
  -F "poll_seconds=3"
# Expected: JSON with job_id and completed result
```

### Batch Generate (Mock Mode)
```bash
curl -X POST http://localhost:8000/batch \
  -F "file=@coffee_fit_test2.jpg" \
  -F "poll_seconds=5"
# Expected: JSON with multiple room preset results
```

## Production Testing

1. **Set environment variables:**
   ```bash
   export RUNPOD_API_KEY="your_key_here"
   export RUNPOD_ENDPOINT_BASE="https://api.runpod.ai/v2/your_endpoint"
   export MOCK_MODE=false
   export PORT=8000
   ```

2. **Start server:**
   ```bash
   ./start_fastapi_server.sh
   ```

3. **Test with real RunPod integration** (use actual artwork files)

## Deployment Configuration

**For Replit Deployment, use this exact command as specified:**
```bash
uvicorn app:app --host 0.0.0.0 --port $PORT --workers 1 --no-access-log
```

**Environment Variables Required:**
- `PORT` - Server port (default: 8000)
- `RUNPOD_API_KEY` - Your RunPod API key
- `RUNPOD_ENDPOINT_BASE` - Your RunPod endpoint URL
- `MOCK_MODE` - Set to "true" for testing, "false" for production

## Architecture Benefits

✅ **Single Process** - No port conflicts or dual-server complexity
✅ **Fast Health Checks** - /healthz responds in <100ms without external calls  
✅ **Async Operations** - Non-blocking RunPod operations using asyncio.create_task()
✅ **Retry Logic** - Exponential backoff for 502/503/504 errors
✅ **Graceful Degradation** - Server stays alive when RunPod is unavailable
✅ **Production Ready** - Follows exact Replit deployment specification