#!/usr/bin/env python3
"""
FastAPI Endpoint Testing Script
Tests all endpoints to verify single server functionality
"""

import requests
import json
import time
import sys
import os
from pathlib import Path

def test_endpoint(url, method="GET", data=None, files=None, timeout=10):
    """Test a single endpoint and return results"""
    try:
        start_time = time.time()
        if method == "GET":
            response = requests.get(url, timeout=timeout)
        elif method == "POST":
            response = requests.post(url, data=data, files=files, timeout=timeout)
        
        response_time = time.time() - start_time
        
        return {
            "success": True,
            "status_code": response.status_code,
            "response_time": round(response_time * 1000, 2),  # ms
            "content": response.text[:500] if response.status_code != 200 else response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "response_time": 0
        }

def main():
    base_url = f"http://localhost:{os.getenv('PORT', '8000')}"
    print(f"🧪 Testing FastAPI Single Server at {base_url}")
    print("=" * 60)
    
    # Test health endpoint
    print("\n1. Health Endpoint (/healthz)")
    result = test_endpoint(f"{base_url}/healthz")
    if result["success"]:
        print(f"   ✅ Status: {result['status_code']} | Time: {result['response_time']}ms")
        print(f"   📋 Response: {result['content']}")
    else:
        print(f"   ❌ Failed: {result['error']}")
    
    # Test root endpoint
    print("\n2. Root Endpoint (/)")
    result = test_endpoint(f"{base_url}/")
    if result["success"]:
        print(f"   ✅ Status: {result['status_code']} | Time: {result['response_time']}ms")
        print(f"   📋 Response: {result['content']}")
    else:
        print(f"   ❌ Failed: {result['error']}")
    
    # Test status endpoint
    print("\n3. Status Endpoint (/status)")
    result = test_endpoint(f"{base_url}/status")
    if result["success"]:
        print(f"   ✅ Status: {result['status_code']} | Time: {result['response_time']}ms")
        if isinstance(result['content'], dict):
            print(f"   📋 FastAPI Running: {result['content'].get('fastapi_running', 'Unknown')}")
            print(f"   📋 Mock Mode: {result['content'].get('mock_mode', 'Unknown')}")
            print(f"   📋 RunPod Status: {result['content'].get('runpod_status', 'Unknown')}")
        else:
            print(f"   📋 Response: {result['content']}")
    else:
        print(f"   ❌ Failed: {result['error']}")
    
    # Test generate endpoint (if we have a test image)
    test_image = Path("coffee_fit_test2.jpg")
    if test_image.exists():
        print("\n4. Generate Endpoint (/generate)")
        with open(test_image, 'rb') as f:
            files = {'file': f}
            data = {
                'prompt': 'Modern bedroom with framed coffee artwork',
                'poll_seconds': '3'
            }
            result = test_endpoint(f"{base_url}/generate", method="POST", data=data, files=files, timeout=30)
        
        if result["success"]:
            print(f"   ✅ Status: {result['status_code']} | Time: {result['response_time']}ms")
            try:
                content = json.loads(result['content']) if isinstance(result['content'], str) else result['content']
                print(f"   📋 Job ID: {content.get('job_id', 'Missing')}")
                print(f"   📋 Result Status: {content.get('result', {}).get('status', 'Missing')}")
            except:
                print(f"   📋 Response: {result['content'][:200]}...")
        else:
            print(f"   ❌ Failed: {result['error']}")
    else:
        print("\n4. Generate Endpoint (/generate)")
        print("   ⚠️  Skipped - No test image (coffee_fit_test2.jpg) found")
    
    print("\n" + "=" * 60)
    print("✅ FastAPI Single Server Test Complete")

if __name__ == "__main__":
    main()