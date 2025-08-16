#!/usr/bin/env python3
import requests
import json

print("🔍 Using token from browser localStorage...")

# Use token from browser (observed from logs)
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3YjM3NWJlNy0yZTc3LTRlN2QtYjdlOS0yYjIxMTM1Nzg5ZjIiLCJpYXQiOjE3MjM3MDg1NDcsImV4cCI6MTcyNTA0OTc0N30.eJCwmXjLlYt_wEUshyA9J5sSxdZOhUMlAD8a8HwYhpw"

print(f"Token: {token[:30]}...")

print("🔍 Testing authentication with FastAPI...")

# Test authenticated request to FastAPI
headers = {"Authorization": f"Bearer {token}"}

# Create a simple test file
import io
test_file = io.BytesIO(b"fake image data for testing")

files = {"file": ("test.jpg", test_file, "image/jpeg")}
data = {"mode": "single_template", "template": "bedroom"}

print("📡 Sending request to FastAPI...")
try:
    response = requests.post(
        "http://127.0.0.1:8001/generate-template-mockups",
        headers=headers,
        files=files,
        data=data,
        timeout=30
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}...")
except Exception as e:
    print(f"Error: {e}")