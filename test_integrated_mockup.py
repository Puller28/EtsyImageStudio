#!/usr/bin/env python3
"""
Direct test of the integrated local mockup functionality
"""

import sys
import os
import asyncio
import base64
from PIL import Image
import io

# Add current directory to path to import local modules
sys.path.append('.')

def create_simple_test_image():
    """Create a minimal test image"""
    img = Image.new('RGB', (256, 256), color='red')
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    return buf.getvalue()

async def test_local_mockup_direct():
    """Test local mockup generation directly"""
    print("🧪 Testing Local Mockup Generation Directly")
    
    try:
        # Import the local mockup function
        from local_mockup_api import generate_local_mockups
        
        # Create test image
        img_bytes = create_simple_test_image()
        print(f"📸 Created test image: {len(img_bytes)} bytes")
        
        # Test with single template first
        print("🔧 Testing single template mockup...")
        result = generate_local_mockups(img_bytes, "single_template", "living_room")
        
        print(f"📊 Result type: {type(result)}")
        print(f"📊 Result keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
        
        if "results" in result:
            mockups = result["results"]
            print(f"✅ Generated {len(mockups)} mockups")
            
            for i, mockup in enumerate(mockups):
                style = mockup.get("style", "unknown")
                has_image = bool(mockup.get("image_b64", ""))
                print(f"  Mockup {i+1}: {style}, has_image: {has_image}")
                
                if has_image:
                    img_data = mockup["image_b64"]
                    print(f"    Image data length: {len(img_data)} chars")
                    
                    # Validate base64
                    try:
                        decoded = base64.b64decode(img_data)
                        print(f"    Valid base64, decoded size: {len(decoded)} bytes")
                        
                        # Save a sample for verification
                        with open("test_result.jpg", "wb") as f:
                            f.write(decoded)
                        print("    ✅ Sample saved as test_result.jpg")
                    except Exception as e:
                        print(f"    ❌ Invalid base64: {e}")
        else:
            print("❌ No 'results' key in response")
            print(f"Available keys: {list(result.keys()) if isinstance(result, dict) else 'N/A'}")
            
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(test_local_mockup_direct())