#!/usr/bin/env python3
"""
Test the complete integration flow from frontend to local mockup generation

This script tests the full integration without hardcoded credentials.

Usage:
1. Set TEST_EMAIL and TEST_PASSWORD environment variables
2. Run: python test_frontend_integration.py

Example:
export TEST_EMAIL="test@example.com"
export TEST_PASSWORD="[your-secure-password]"
python test_frontend_integration.py
"""

import requests
import json
import base64
import os
from PIL import Image
import io

def create_test_image():
    """Create a simple test artwork image"""
    img = Image.new('RGB', (512, 512), color='red')
    # Add a simple pattern to make it look like artwork
    from PIL import ImageDraw
    draw = ImageDraw.Draw(img)
    draw.rectangle([100, 100, 400, 400], fill='blue')
    draw.ellipse([150, 150, 350, 350], fill='yellow')
    
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return buf.getvalue()

def get_auth_token():
    """Get a valid JWT token from the main app using environment variables"""
    
    # Get credentials from environment variables
    test_email = os.getenv("TEST_EMAIL")
    test_password = os.getenv("TEST_PASSWORD")
    
    if not test_email or not test_password:
        print("❌ TEST_EMAIL and TEST_PASSWORD environment variables are required")
        print("💡 Set them with: export TEST_EMAIL='your@email.com' TEST_PASSWORD='[secure-password]'")
        return None
    
    # First, try to register/login to get a token
    auth_url = "http://localhost:5000/api/auth/register"
    auth_data = {
        "email": test_email,
        "password": test_password,
        "name": "Test User"
    }
    
    try:
        response = requests.post(auth_url, json=auth_data)
        if response.status_code == 200:
            data = response.json()
            return data.get('token')
        else:
            # Try login instead
            login_url = "http://localhost:5000/api/auth/login"
            login_data = {
                "email": test_email, 
                "password": test_password
            }
            response = requests.post(login_url, json=login_data)
            if response.status_code == 200:
                data = response.json()
                return data.get('token')
    except Exception as e:
        print(f"Auth failed: {e}")
        return None

def test_local_mockup_integration():
    """Test the integrated local mockup generation"""
    print("🧪 Testing Local Mockup Integration")
    
    # Get authentication token
    token = get_auth_token()
    if not token:
        print("❌ Could not get auth token - testing without auth")
        token = "test-token"
    else:
        print(f"✅ Got auth token: {token[:20]}...")
    
    # Create test image
    img_bytes = create_test_image()
    print(f"📸 Created test image: {len(img_bytes)} bytes")
    
    # Test the FastAPI endpoint directly
    url = "http://localhost:8001/generate-template-mockups"
    
    files = {
        'file': ('test_artwork.jpg', img_bytes, 'image/jpeg')
    }
    
    data = {
        'mode': 'single_template',
        'template': 'living_room'
    }
    
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    print("🔧 Testing local mockup generation...")
    try:
        response = requests.post(url, files=files, data=data, headers=headers, timeout=60)
        print(f"📊 Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Local integration test successful!")
            print(f"📋 Response contains: {list(result.keys())}")
            
            if 'mockups' in result:
                mockups = result['mockups']
                print(f"📋 Generated {len(mockups)} mockups")
                
                for i, mockup in enumerate(mockups):
                    template = mockup.get('template', 'unknown')
                    has_image = bool(mockup.get('image', ''))
                    print(f"  Mockup {i+1}: {template}, has_image: {has_image}")
                    
                    if has_image:
                        img_data = mockup['image']
                        print(f"    Image data length: {len(img_data)} chars")
                        
                        # Validate it's proper base64
                        try:
                            decoded = base64.b64decode(img_data)
                            print(f"    Valid base64, decoded size: {len(decoded)} bytes")
                        except Exception as e:
                            print(f"    Invalid base64: {e}")
                
                print(f"🎉 Local generation successful: {result.get('local_generation', False)}")
            else:
                print("⚠️ No mockups in response")
        else:
            print(f"❌ Error: {response.status_code}")
            error_text = response.text
            print(f"❌ Response: {error_text[:500]}")
            
            # Check if it's an auth error
            if response.status_code == 401:
                print("🔐 Authentication required - this is expected behavior")
            elif response.status_code == 400:
                print("📝 Bad request - checking error details")
            elif response.status_code == 500:
                print("⚠️ Server error - checking logs")
                
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")

if __name__ == "__main__":
    test_local_mockup_integration()