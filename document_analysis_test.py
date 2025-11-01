#!/usr/bin/env python3
"""
Test específico para verificar la corrección del manejo de errores en análisis de documentos
Verifica que los errores 403 (límites de plan) se manejen correctamente y no se conviertan en 500
"""

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
BACKEND_URL = "https://jika-taskmaster.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class DocumentAnalysisErrorTester:
    def __init__(self):
        self.test_results = []
        self.tests_run = 0
        self.tests_passed = 0

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            'name': name,
            'success': success,
            'details': details,
            'response_data': response_data
        })

    def make_request(self, method: str, endpoint: str, data: Any = None, files: Any = None, token: str = None) -> tuple:
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
            else:
                return False, f"Unsupported method: {method}", None
            
            try:
                response_data = response.json() if response.content else {}
            except json.JSONDecodeError:
                response_data = {"raw_response": response.text}
            
            return True, response.status_code, response_data
        except requests.exceptions.RequestException as e:
            return False, f"Request failed: {str(e)}", None

    def create_free_account(self) -> tuple:
        """Create a new free account for testing"""
        timestamp = int(time.time())
        test_email = f"free_test_{timestamp}@example.com"
        test_password = "TestPassword123!"
        test_name = f"Free Test User {timestamp}"
        
        register_data = {
            "email": test_email,
            "password": test_password,
            "full_name": test_name,
            "device_id": f"test_device_{timestamp}"
        }
        
        success, status_code, data = self.make_request('POST', '/auth/register', register_data)
        
        if success and status_code == 200 and 'access_token' in data:
            return data['access_token'], data['user'], test_email
        else:
            return None, None, test_email

    def login_premium_account(self) -> tuple:
        """Login with premium account"""
        login_data = {
            "email": "ortizisacc18@gmail.com",
            "password": "premium123",  # Assuming this password, may need to be adjusted
            "device_id": f"premium_test_device_{int(time.time())}"
        }
        
        success, status_code, data = self.make_request('POST', '/auth/login', login_data)
        
        if success and status_code == 200 and 'access_token' in data:
            return data['access_token'], data['user']
        else:
            return None, None

    def test_document_analysis_with_file(self, token: str, test_name: str) -> tuple:
        """Test document analysis with actual file"""
        try:
            with open('/tmp/test_document.txt', 'rb') as f:
                files = {'file': ('test_document.txt', f, 'text/plain')}
                data = {'action': 'analyze'}
                
                success, status_code, response_data = self.make_request(
                    'POST', '/ai/analyze-document', data, files, token
                )
                
                return success, status_code, response_data
        except Exception as e:
            return False, f"File error: {str(e)}", None

    def test_project_upload_limits(self, token: str) -> None:
        """Test project upload limits for free accounts"""
        print("\n🔍 Testing Project Upload Limits...")
        
        # Try to upload multiple projects to test the limit
        for i in range(12):  # Free limit is 10, so this should fail at 11th
            try:
                with open('/tmp/test_document.txt', 'rb') as f:
                    files = {'file': (f'test_project_{i}.txt', f, 'text/plain')}
                    data = {
                        'name': f'Test Project {i}',
                        'description': f'Test project number {i}'
                    }
                    
                    success, status_code, response_data = self.make_request(
                        'POST', '/projects/upload', data, files, token
                    )
                    
                    if i < 10:  # Should succeed for first 10
                        self.log_test(
                            f"Project upload {i+1}/10 (should succeed)",
                            success and status_code == 200,
                            f"Status: {status_code}" if success else str(status_code),
                            response_data
                        )
                    else:  # Should fail with 403 for 11th and beyond
                        expected_403 = status_code == 403
                        has_limit_message = "límite" in str(response_data).lower() if response_data else False
                        
                        self.log_test(
                            f"Project upload {i+1} (should fail with 403)",
                            expected_403 and has_limit_message,
                            f"Status: {status_code}, Has limit message: {has_limit_message}",
                            response_data
                        )
                        
                        if expected_403:
                            break  # Stop after first 403 error
                            
            except Exception as e:
                self.log_test(
                    f"Project upload {i+1} (error)",
                    False,
                    f"Exception: {str(e)}",
                    None
                )

    def run_document_analysis_tests(self):
        """Run all document analysis error handling tests"""
        print("🚀 Testing Document Analysis Error Handling Fix")
        print(f"🔗 Testing against: {BACKEND_URL}")
        print("=" * 60)
        
        # Test 1: Create new free account and test limits
        print("\n🔍 Testing Free Account Document Analysis Limits...")
        
        token, user, email = self.create_free_account()
        if not token:
            self.log_test(
                "Create free account for testing",
                False,
                "Failed to create free account",
                None
            )
            return
        
        self.log_test(
            "Create free account for testing",
            True,
            f"Account created: {email}",
            {"email": email, "plan": user.get("plan", "unknown")}
        )
        
        # Verify account is free
        is_free_plan = user.get("plan") == "free"
        self.log_test(
            "Verify account has free plan",
            is_free_plan,
            f"Plan: {user.get('plan', 'unknown')}",
            {"plan": user.get("plan")}
        )
        
        # Test first analysis (should work)
        print("\n📄 Testing first document analysis (should succeed)...")
        success, status_code, response_data = self.test_document_analysis_with_file(token, "First analysis")
        
        first_analysis_success = success and status_code == 200
        self.log_test(
            "First document analysis (should succeed)",
            first_analysis_success,
            f"Status: {status_code}" if success else str(status_code),
            response_data
        )
        
        # Test second analysis (should fail with 403)
        print("\n📄 Testing second document analysis (should fail with 403)...")
        success, status_code, response_data = self.test_document_analysis_with_file(token, "Second analysis")
        
        # Check if it's 403 (correct) and not 500 (bug)
        is_403_error = status_code == 403
        is_not_500_error = status_code != 500
        has_correct_message = False
        
        if response_data and isinstance(response_data, dict):
            detail = response_data.get("detail", "")
            has_correct_message = "límite de 1 análisis ia por día alcanzado" in detail.lower()
        
        self.log_test(
            "Second analysis returns 403 (not 500)",
            is_403_error and is_not_500_error,
            f"Status: {status_code}, Expected: 403",
            response_data
        )
        
        self.log_test(
            "Error message is correct for plan limits",
            has_correct_message,
            f"Message contains limit info: {has_correct_message}",
            {"message": response_data.get("detail", "") if response_data else ""}
        )
        
        # Test project upload limits
        self.test_project_upload_limits(token)
        
        # Test 2: Premium account (should have no limits)
        print("\n🔍 Testing Premium Account (ortizisacc18@gmail.com)...")
        
        # Try to login with premium account
        premium_token, premium_user = self.login_premium_account()
        
        if premium_token:
            self.log_test(
                "Login with premium account",
                True,
                f"Premium account logged in successfully",
                {"email": "ortizisacc18@gmail.com", "plan": premium_user.get("plan")}
            )
            
            # Verify premium plan
            is_premium = premium_user.get("plan") == "premium"
            self.log_test(
                "Verify premium plan status",
                is_premium,
                f"Plan: {premium_user.get('plan', 'unknown')}",
                {"plan": premium_user.get("plan")}
            )
            
            # Test multiple analyses (should all work)
            print("\n📄 Testing multiple document analyses with premium account...")
            for i in range(3):
                success, status_code, response_data = self.test_document_analysis_with_file(
                    premium_token, f"Premium analysis {i+1}"
                )
                
                analysis_success = success and status_code == 200
                self.log_test(
                    f"Premium account analysis {i+1} (should succeed)",
                    analysis_success,
                    f"Status: {status_code}" if success else str(status_code),
                    response_data
                )
        else:
            self.log_test(
                "Login with premium account",
                False,
                "Could not login with premium account - may need correct password",
                None
            )
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 DOCUMENT ANALYSIS ERROR HANDLING TEST SUMMARY")
        print("=" * 60)
        print(f"Total tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Print failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  • {test['name']}: {test['details']}")
        else:
            print(f"\n✅ ALL TESTS PASSED!")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = DocumentAnalysisErrorTester()
    success = tester.run_document_analysis_tests()
    
    # Save detailed results
    results = {
        'timestamp': datetime.now().isoformat(),
        'backend_url': BACKEND_URL,
        'test_type': 'document_analysis_error_handling',
        'total_tests': tester.tests_run,
        'passed_tests': tester.tests_passed,
        'failed_tests': tester.tests_run - tester.tests_passed,
        'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
        'test_details': tester.test_results
    }
    
    with open('/app/document_analysis_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())