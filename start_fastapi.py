#!/usr/bin/env python3
import os
import sys
import uvicorn

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the FastAPI app
from app import app

if __name__ == "__main__":
    print("Starting FastAPI server on port 8001...")
    print("RunPod API Key present:", bool(os.getenv('RUNPOD_API_KEY')))
    print("RunPod Endpoint Base present:", bool(os.getenv('RUNPOD_ENDPOINT_BASE')))
    
    # Run the server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info",
        access_log=True
    )