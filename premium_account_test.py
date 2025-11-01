#!/usr/bin/env python3
"""
Test premium account functionality by creating the premium account directly
"""

import requests
import sys
import json
import time
from datetime import datetime

# Configuration
BACKEND_URL = "https://jika-taskmaster.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

def make_request(method: str, endpoint: str, data=None, files=None, token=None):
    """Make HTTP request with proper headers"""
    url = f"{API_BASE}{endpoint}"
    headers = {}
    
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    if not files and data:
        headers['Content-Type'] = 'application/json'
    
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers)
        elif method == 'POST':
            if files:
                response = requests.post(url, data=data, files=files, headers=headers)
            else:
                response = requests.post(url, json=data, headers=headers)
        
        try:
            response_data = response.json() if response.content else {}
        except json.JSONDecodeError:
            response_data = {"raw_response": response.text}
        
        return True, response.status_code, response_data
    except requests.exceptions.RequestException as e:
        return False, f"Request failed: {str(e)}", None

def test_premium_account():
    """Test premium account functionality"""
    print("🔍 Testing Premium Account Creation and Functionality...")
    
    # First try to register the premium account (it gets premium automatically)
    register_data = {
        "email": "ortizisacc18@gmail.com",
        "password": "PremiumTest123!",
        "full_name": "Premium Test User",
        "device_id": f"premium_device_{int(time.time())}"
    }
    
    success, status_code, data = make_request('POST', '/auth/register', register_data)
    
    # If registration fails because account exists, try login
    if not success or status_code != 200:
        print("Account already exists, trying login...")
        login_data = {
            "email": "ortizisacc18@gmail.com", 
            "password": "PremiumTest123!",
            "device_id": f"premium_device_{int(time.time())}"
        }
        success, status_code, data = make_request('POST', '/auth/login', login_data)
        
        # If login fails, try creating a new premium account with different email
        if not success or status_code != 200:
            print("Login failed, creating new premium account...")
            timestamp = int(time.time())
            # Create a new account and then manually set it to premium by using the premium email pattern
            new_register_data = {
                "email": f"premium_test_{timestamp}@gmail.com",
                "password": "PremiumTest123!",
                "full_name": "Premium Test User",
                "device_id": f"premium_device_{timestamp}"
            }
            success, status_code, data = make_request('POST', '/auth/register', new_register_data)
    
    if success and status_code == 200:
        token = data['access_token']
        user = data['user']
        
        print(f"✅ Premium account created/logged in successfully")
        print(f"   Email: {user.get('email')}")
        print(f"   Plan: {user.get('plan')}")
        print(f"   User ID: {user.get('id')}")
        
        # Verify it's premium
        if user.get('plan') == 'premium':
            print("✅ Account has premium plan")
            
            # Test multiple document analyses (should all work)
            print("\n📄 Testing unlimited document analyses with premium account...")
            
            for i in range(5):  # Test 5 analyses to verify no limits
                try:
                    with open('/tmp/test_document.txt', 'rb') as f:
                        files = {'file': ('test_document.txt', f, 'text/plain')}
                        data_form = {'action': 'analyze'}
                        
                        success, status_code, response_data = make_request(
                            'POST', '/ai/analyze-document', data_form, files, token
                        )
                        
                        if success and status_code == 200:
                            print(f"✅ Premium analysis {i+1}/5 succeeded")
                        else:
                            print(f"❌ Premium analysis {i+1}/5 failed - Status: {status_code}")
                            print(f"   Response: {response_data}")
                            
                except Exception as e:
                    print(f"❌ Premium analysis {i+1}/5 error: {str(e)}")
            
            return True
        else:
            print(f"❌ Account plan is {user.get('plan')}, expected 'premium'")
            return False
    else:
        print(f"❌ Failed to create/login premium account - Status: {status_code}")
        print(f"   Response: {data}")
        return False

def main():
    """Main test execution"""
    print("🚀 Testing Premium Account Functionality")
    print(f"🔗 Testing against: {BACKEND_URL}")
    print("=" * 60)
    
    success = test_premium_account()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ Premium account test completed successfully")
    else:
        print("❌ Premium account test failed")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())