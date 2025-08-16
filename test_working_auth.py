#!/usr/bin/env python3
import requests
import jwt as pyjwt
import os

# Generate a fresh token with current secret
JWT_SECRET = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production")
fresh_token = pyjwt.encode({"userId": "7b375be7-2e77-4e7d-b7e9-2b21135789f2"}, JWT_SECRET, algorithm="HS256")

print(f"🔑 Testing with fresh token: {fresh_token[:30]}...")

# Test FastAPI authentication with fresh token
headers = {"Authorization": f"Bearer {fresh_token}"}
files = {"file": ("test.jpg", b"fake image data", "image/jpeg")}
data = {"mode": "single_template", "template": "bedroom"}

try:
    response = requests.post(
        "http://127.0.0.1:8001/generate-template-mockups",
        headers=headers,
        files=files,
        data=data,
        timeout=10
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}...")
    
    if response.status_code == 401:
        print("❌ Still getting 401 - authentication not working")
    elif response.status_code in [200, 422]:
        print("✅ Authentication working! (422 expected with fake data)")
    else:
        print(f"❓ Unexpected status: {response.status_code}")
        
except Exception as e:
    print(f"❌ Request failed: {e}")