#!/usr/bin/env python3
"""
Test OpenAI API connectivity and Etsy listing generation
"""

import os
import requests
import json

def test_openai_direct():
    """Test OpenAI API directly using Python requests"""
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        print("❌ No OPENAI_API_KEY environment variable found")
        return False
        
    print(f"✅ Found OpenAI API key: {api_key[:10]}...")
    
    # Test OpenAI API call
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "gpt-4o",
        "messages": [
            {
                "role": "user", 
                "content": "Create an optimized Etsy listing for a digital art print.\n\nArtwork: Abstract Sunset\nStyle/Keywords: modern, vibrant, colorful\n\nGenerate a complete listing with:\n1. SEO-optimized title (max 140 chars) including \"Digital Download\" and \"Printable Art\"\n2. Exactly 13 relevant tags (1-3 words each) for Etsy search\n3. Compelling description with 3 paragraphs:\n   - Paragraph 1: Describe the artwork's visual appeal and style\n   - Paragraph 2: Suggest where/how to use it (home decor, office, gifts)\n   - Paragraph 3: What the buyer receives (formats, quality, instant download)\n\nReturn valid JSON only: {\"title\": \"...\", \"tags\": [\"tag1\", \"tag2\", ...], \"description\": \"para1\\n\\npara2\\n\\npara3\"}"
            }
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.7
    }
    
    try:
        print("🔗 Making request to OpenAI...")
        response = requests.post(url, headers=headers, json=data, timeout=30)
        
        print(f"📊 Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            print("✅ OpenAI API call successful!")
            print(f"📄 Response content: {content[:200]}...")
            
            # Try to parse the JSON
            try:
                parsed = json.loads(content)
                print("✅ JSON parsing successful!")
                print(f"📋 Title: {parsed.get('title', 'N/A')[:50]}...")
                print(f"📋 Tags count: {len(parsed.get('tags', []))}")
                print(f"📋 Description length: {len(parsed.get('description', ''))}")
                return True
            except json.JSONDecodeError as e:
                print(f"❌ JSON parsing failed: {e}")
                return False
        else:
            print(f"❌ OpenAI API call failed: {response.status_code}")
            print(f"❌ Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing OpenAI API connectivity...")
    success = test_openai_direct()
    
    if success:
        print("🎉 OpenAI integration test passed!")
    else:
        print("💥 OpenAI integration test failed!")