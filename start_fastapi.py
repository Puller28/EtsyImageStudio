#!/usr/bin/env python3
import os
import sys
import uvicorn

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the FastAPI app
from app import app

if __name__ == "__main__":
    # Use FASTAPI_PORT first, then fallback to 8001
    # Don't use PORT as that conflicts with Express
    port = int(os.getenv("FASTAPI_PORT", 8001))
    
    print(f"Starting FastAPI server on 0.0.0.0:{port}...")
    print("RunPod API Key present:", bool(os.getenv('RUNPOD_API_KEY')))
    print("RunPod Endpoint Base present:", bool(os.getenv('RUNPOD_ENDPOINT_BASE')))
    
    # Always bind to 0.0.0.0 for Replit compatibility
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=True
    )