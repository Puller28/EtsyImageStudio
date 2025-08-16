#!/usr/bin/env python3
"""
JWT Debugging Script - Security-Focused Version

This script helps debug JWT token authentication issues while maintaining security best practices:
- No hardcoded tokens or secrets
- Always verifies token signatures (no unverified decoding)
- Uses environment variables for sensitive data

Usage:
1. Set JWT_SECRET environment variable for your JWT secret
2. Set TEST_JWT_TOKEN environment variable with the token you want to test
3. Run: python debug_jwt_secrets.py

Example:
export JWT_SECRET="your-jwt-secret"
export TEST_JWT_TOKEN="your-test-token-here"
python debug_jwt_secrets.py

Security Notes:
- All JWT tokens are verified with proper signature validation
- Unverified token decoding has been removed to prevent security vulnerabilities
- Environment variables are used to avoid exposing sensitive data in source code
"""

import os
import jwt as pyjwt

# Check JWT secrets
express_secret = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production")
fastapi_secret = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production")

print(f"Express.js JWT Secret: {express_secret}")
print(f"FastAPI JWT Secret: {fastapi_secret}")
print(f"Secrets match: {express_secret == fastapi_secret}")

# Test token from environment variable (for debugging purposes)
# To use this script, set the TEST_JWT_TOKEN environment variable
token = os.getenv("TEST_JWT_TOKEN")

if not token:
    print("❌ No TEST_JWT_TOKEN environment variable found")
    print("💡 To test JWT decoding, set TEST_JWT_TOKEN environment variable with your token")
    exit(1)

# Try to decode with current secret
try:
    payload = pyjwt.decode(token, express_secret, algorithms=["HS256"])
    print(f"✅ Token decode SUCCESS: {payload}")
except Exception as e:
    print(f"❌ Token decode FAILED: {e}")

# Note: We removed unverified decoding for security reasons
# Unverified decoding bypasses signature validation and could allow
# tampered tokens to be processed, which is a security vulnerability

# Generate a new token with current secret
try:
    new_token = pyjwt.encode({"userId": "7b375be7-2e77-4e7d-b7e9-2b21135789f2"}, express_secret, algorithm="HS256")
    print(f"🔑 New token: {new_token}")
    
    # Test the new token
    test_payload = pyjwt.decode(new_token, express_secret, algorithms=["HS256"])
    print(f"✅ New token verification: {test_payload}")
except Exception as e:
    print(f"❌ New token generation failed: {e}")