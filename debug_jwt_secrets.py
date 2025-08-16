#!/usr/bin/env python3
import os
import jwt as pyjwt

# Check JWT secrets
express_secret = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production")
fastapi_secret = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production")

print(f"Express.js JWT Secret: {express_secret}")
print(f"FastAPI JWT Secret: {fastapi_secret}")
print(f"Secrets match: {express_secret == fastapi_secret}")

# Test token from browser
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3YjM3NWJlNy0yZTc3LTRlN2QtYjdlOS0yYjIxMTM1Nzg5ZjIiLCJpYXQiOjE3MjM3MDg1NDcsImV4cCI6MTcyNTA0OTc0N30.eJCwmXjLlYt_wEUshyA9J5sSxdZOhUMlAD8a8HwYhpw"

# Try to decode with current secret
try:
    payload = pyjwt.decode(token, express_secret, algorithms=["HS256"])
    print(f"✅ Token decode SUCCESS: {payload}")
except Exception as e:
    print(f"❌ Token decode FAILED: {e}")

# Try to decode without verification
try:
    unverified = pyjwt.decode(token, options={"verify_signature": False})
    print(f"🔍 Unverified payload: {unverified}")
except Exception as e:
    print(f"❌ Unverified decode failed: {e}")

# Generate a new token with current secret
try:
    new_token = pyjwt.encode({"userId": "7b375be7-2e77-4e7d-b7e9-2b21135789f2"}, express_secret, algorithm="HS256")
    print(f"🔑 New token: {new_token}")
    
    # Test the new token
    test_payload = pyjwt.decode(new_token, express_secret, algorithms=["HS256"])
    print(f"✅ New token verification: {test_payload}")
except Exception as e:
    print(f"❌ New token generation failed: {e}")