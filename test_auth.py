#!/usr/bin/env python3
"""
Authentication Test Script - Security-Focused Version

This script tests FastAPI authentication without hardcoding sensitive tokens.

Usage:
1. Set TEST_JWT_TOKEN environment variable with your token
2. Run: python test_auth.py

Example:
export TEST_JWT_TOKEN="your-test-token-here"
python test_auth.py
"""

import requests
import json
import os

print("🔍 Loading token from environment variable...")

# Use token from secure environment variable
token = os.getenv("TEST_JWT_TOKEN")

if not token:
    print("❌ No TEST_JWT_TOKEN environment variable found")
    print("💡 To test authentication, set TEST_JWT_TOKEN environment variable")
    print("Example: export TEST_JWT_TOKEN='your-token-here'")
    exit(1)

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