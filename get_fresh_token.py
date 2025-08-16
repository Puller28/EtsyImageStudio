#!/usr/bin/env python3
import requests
import json

print("🔍 Getting fresh JWT token from Express.js...")

# Login to get fresh token
login_response = requests.post(
    "http://localhost:5000/api/login",
    headers={"Content-Type": "application/json"},
    json={"email": "a@a.com", "password": "a"}
)

print(f"Login response status: {login_response.status_code}")
print(f"Login response headers: {dict(login_response.headers)}")

if login_response.status_code == 200:
    try:
        login_data = login_response.json()
        token = login_data.get("token")
        print(f"✅ Fresh token obtained: {token[:30]}...")
        with open("fresh_token.txt", "w") as f:
            f.write(token)
    except:
        print(f"❌ Could not parse JSON response")
        print(f"Response text: {login_response.text[:200]}...")
else:
    print(f"❌ Login failed with status {login_response.status_code}")
    print(f"Response: {login_response.text}")