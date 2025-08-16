#!/usr/bin/env python3
import requests
import json
import time

def test_fastapi_health():
    print("🔍 Testing FastAPI health...")
    try:
        response = requests.get("http://127.0.0.1:8001/health", timeout=5)
        print(f"FastAPI Health Status: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
            return True
    except Exception as e:
        print(f"FastAPI Health Error: {e}")
    return False

def get_valid_token():
    print("🔍 Getting valid token from Express.js...")
    try:
        response = requests.get("http://localhost:5000/api/user", headers={
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3YjM3NWJlNy0yZTc3LTRlN2QtYjdlOS0yYjIxMTM1Nzg5ZjIiLCJpYXQiOjE3MjM3MDg1NDcsImV4cCI6MTcyNTA0OTc0N30.eJCwmXjLlYt_wEUshyA9J5sSxdZOhUMlAD8a8HwYhpw"
        })
        print(f"Express.js token validation: {response.status_code}")
        if response.status_code == 200:
            return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3YjM3NWJlNy0yZTc3LTRlN2QtYjdlOS0yYjIxMTM1Nzg5ZjIiLCJpYXQiOjE3MjM3MDg1NDcsImV4cCI6MTcyNTA0OTc0N30.eJCwmXjLlYt_wEUshyA9J5sSxdZOhUMlAD8a8HwYhpw"
    except Exception as e:
        print(f"Token validation error: {e}")
    return None

def test_template_mockup_auth(token):
    print("🔍 Testing template mockup authentication...")
    
    files = {"file": ("test.jpg", b"fake image data", "image/jpeg")}
    data = {"mode": "single_template", "template": "bedroom"}
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.post(
            "http://127.0.0.1:8001/generate-template-mockups",
            headers=headers,
            files=files,
            data=data,
            timeout=10
        )
        print(f"Template mockup status: {response.status_code}")
        print(f"Response: {response.text[:300]}...")
        return response.status_code
    except Exception as e:
        print(f"Template mockup error: {e}")
        return None

if __name__ == "__main__":
    print("🚀 FastAPI Authentication Test Suite")
    print("=" * 50)
    
    # Test 1: FastAPI Health
    if not test_fastapi_health():
        print("❌ FastAPI not responding")
        exit(1)
    
    time.sleep(1)
    
    # Test 2: Get valid token
    token = get_valid_token()
    if not token:
        print("❌ Could not get valid token")
        exit(1)
    
    time.sleep(1)
    
    # Test 3: Test template mockup with auth
    status = test_template_mockup_auth(token)
    if status == 200:
        print("✅ Template mockup authentication working!")
    elif status == 401:
        print("❌ Authentication failed")
    elif status == 422:
        print("⚠️ Authentication OK, validation error (expected with fake data)")
    else:
        print(f"❓ Unexpected status: {status}")