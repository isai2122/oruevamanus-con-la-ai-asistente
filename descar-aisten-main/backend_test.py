#!/usr/bin/env python3
"""
Backend API Testing Suite for Personal Assistant Application
Tests all endpoints including authentication, CRUD operations, and AI features
"""

import requests
import sys
import json
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional

class PersonalAssistantAPITester:
    def __init__(self, base_url="https://jika-taskmaster.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data
        self.test_user = {
            "email": f"test_user_{int(time.time())}@example.com",
            "password": "TestPassword123!",
            "full_name": "Test User"
        }

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED")
        else:
            print(f"❌ {name}: FAILED - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200, auth_required: bool = True) -> tuple:
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}
            
            return success, response_data
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test basic API health"""
        # Test with a simple registration to verify API is working
        test_data = {
            "email": f"health_check_{int(time.time())}@example.com",
            "password": "TestPassword123!",
            "full_name": "Health Check User"
        }
        success, response = self.make_request('POST', '/auth/register', test_data, 200, auth_required=False)
        
        if success and 'access_token' in response:
            self.log_test("API Health Check", True)
            return True
        else:
            self.log_test("API Health Check", False, 
                         f"API not responding properly: {response}")
            return False

    def test_user_registration(self):
        """Test user registration"""
        success, response = self.make_request('POST', '/auth/register', 
                                            self.test_user, 200, auth_required=False)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log_test("User Registration", True)
            return True
        else:
            self.log_test("User Registration", False, 
                         f"Registration failed: {response}")
            return False

    def test_user_login(self):
        """Test user login"""
        login_data = {
            "email": self.test_user["email"],
            "password": self.test_user["password"]
        }
        
        success, response = self.make_request('POST', '/auth/login', 
                                            login_data, 200, auth_required=False)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log_test("User Login", True)
            return True
        else:
            self.log_test("User Login", False, 
                         f"Login failed: {response}")
            return False

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        success, response = self.make_request('GET', '/dashboard/stats')
        
        if success:
            required_fields = ['notes_count', 'events_count', 'tasks_count', 'completed_tasks']
            has_all_fields = all(field in response for field in required_fields)
            self.log_test("Dashboard Stats", has_all_fields,
                         "" if has_all_fields else f"Missing fields in response: {response}")
            return has_all_fields
        else:
            self.log_test("Dashboard Stats", False, f"Request failed: {response}")
            return False

    def test_notes_crud(self):
        """Test Notes CRUD operations"""
        # Create note
        note_data = {
            "title": "Test Note with AI Summary",
            "content": "This is a test note with enough content to trigger AI summary generation. " * 10,
            "tags": ["test", "automation"],
            "folder": "general"
        }
        
        success, response = self.make_request('POST', '/notes', note_data, 200)
        if not success:
            self.log_test("Create Note", False, f"Failed to create note: {response}")
            return False
        
        note_id = response.get('id')
        has_ai_summary = 'ai_summary' in response and response['ai_summary']
        
        self.log_test("Create Note", True)
        self.log_test("AI Summary Generation", has_ai_summary,
                     "" if has_ai_summary else "AI summary not generated")
        
        # Get notes
        success, response = self.make_request('GET', '/notes')
        if success and isinstance(response, list) and len(response) > 0:
            self.log_test("Get Notes", True)
        else:
            self.log_test("Get Notes", False, f"Failed to get notes: {response}")
            return False
        
        # Search notes
        success, response = self.make_request('GET', '/notes?search=test')
        self.log_test("Search Notes", success and isinstance(response, list),
                     "" if success else f"Search failed: {response}")
        
        # Update note
        update_data = {
            "title": "Updated Test Note",
            "content": "Updated content",
            "tags": ["updated"],
            "folder": "general"
        }
        
        success, response = self.make_request('PUT', f'/notes/{note_id}', update_data)
        self.log_test("Update Note", success,
                     "" if success else f"Update failed: {response}")
        
        # Delete note
        success, response = self.make_request('DELETE', f'/notes/{note_id}', expected_status=200)
        self.log_test("Delete Note", success,
                     "" if success else f"Delete failed: {response}")
        
        return True

    def test_events_crud(self):
        """Test Events/Calendar CRUD operations"""
        # Create event
        event_data = {
            "title": "Test Meeting",
            "description": "Test event description",
            "start_date": datetime.now(timezone.utc).isoformat(),
            "end_date": datetime.now(timezone.utc).isoformat(),
            "location": "Test Location",
            "category": "trabajo",
            "color": "#3b82f6"
        }
        
        success, response = self.make_request('POST', '/events', event_data, 200)
        if not success:
            self.log_test("Create Event", False, f"Failed to create event: {response}")
            return False
        
        event_id = response.get('id')
        self.log_test("Create Event", True)
        
        # Get events
        success, response = self.make_request('GET', '/events')
        self.log_test("Get Events", success and isinstance(response, list),
                     "" if success else f"Failed to get events: {response}")
        
        return True

    def test_tasks_crud(self):
        """Test Tasks CRUD operations"""
        # Create task
        task_data = {
            "title": "Test Task",
            "description": "Test task description",
            "priority": "high",
            "category": "test"
        }
        
        success, response = self.make_request('POST', '/tasks', task_data, 200)
        if not success:
            self.log_test("Create Task", False, f"Failed to create task: {response}")
            return False
        
        task_id = response.get('id')
        self.log_test("Create Task", True)
        
        # Get tasks
        success, response = self.make_request('GET', '/tasks')
        self.log_test("Get Tasks", success and isinstance(response, list),
                     "" if success else f"Failed to get tasks: {response}")
        
        # Complete task
        success, response = self.make_request('PUT', f'/tasks/{task_id}/complete')
        self.log_test("Complete Task", success,
                     "" if success else f"Failed to complete task: {response}")
        
        return True

    def test_habits_crud(self):
        """Test Habits CRUD operations"""
        # Create habit
        habit_data = {
            "name": "Test Habit",
            "description": "Test habit description",
            "target_frequency": "daily",
            "color": "#10b981"
        }
        
        success, response = self.make_request('POST', '/habits', habit_data, 200)
        if not success:
            self.log_test("Create Habit", False, f"Failed to create habit: {response}")
            return False
        
        habit_id = response.get('id')
        self.log_test("Create Habit", True)
        
        # Get habits
        success, response = self.make_request('GET', '/habits')
        self.log_test("Get Habits", success and isinstance(response, list),
                     "" if success else f"Failed to get habits: {response}")
        
        # Complete habit
        success, response = self.make_request('POST', f'/habits/{habit_id}/complete')
        self.log_test("Complete Habit", success,
                     "" if success else f"Failed to complete habit: {response}")
        
        return True

    def test_alarms_crud(self):
        """Test Alarms CRUD operations"""
        # Create alarm
        alarm_data = {
            "title": "Test Alarm",
            "time": datetime.now(timezone.utc).isoformat(),
            "recurring": "daily"
        }
        
        success, response = self.make_request('POST', '/alarms', alarm_data, 200)
        if not success:
            self.log_test("Create Alarm", False, f"Failed to create alarm: {response}")
            return False
        
        self.log_test("Create Alarm", True)
        
        # Get alarms
        success, response = self.make_request('GET', '/alarms')
        self.log_test("Get Alarms", success and isinstance(response, list),
                     "" if success else f"Failed to get alarms: {response}")
        
        return True

    def test_global_search(self):
        """Test global search functionality"""
        success, response = self.make_request('GET', '/search?q=test')
        
        if success and isinstance(response, dict):
            has_search_results = any(key in response for key in ['notes', 'events', 'tasks'])
            self.log_test("Global Search", has_search_results,
                         "" if has_search_results else f"No search categories found: {response}")
            return has_search_results
        else:
            self.log_test("Global Search", False, f"Search failed: {response}")
            return False

    def test_ai_task_extraction(self):
        """Test AI task extraction feature"""
        text_data = "I need to call the doctor tomorrow at 2pm and buy groceries after work. Also remember to send the report to the team by Friday."
        
        # Using form data as per the API definition
        import requests
        url = f"{self.api_url}/ai/extract-tasks"
        headers = {'Authorization': f'Bearer {self.token}'}
        data = {'text': text_data}
        
        try:
            response = requests.post(url, data=data, headers=headers, timeout=30)
            success = response.status_code == 200
            
            if success:
                response_data = response.json()
                has_extracted_tasks = 'extracted_tasks' in response_data and 'created_tasks' in response_data
                self.log_test("AI Task Extraction", has_extracted_tasks,
                             "" if has_extracted_tasks else f"Missing task extraction data: {response_data}")
                return has_extracted_tasks
            else:
                self.log_test("AI Task Extraction", False, f"Request failed: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("AI Task Extraction", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Personal Assistant API Test Suite")
        print(f"📍 Testing API at: {self.base_url}")
        print("=" * 60)
        
        # Basic connectivity
        if not self.test_health_check():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Authentication tests
        if not self.test_user_registration():
            print("❌ User registration failed. Stopping tests.")
            return False
        
        if not self.test_user_login():
            print("❌ User login failed. Stopping tests.")
            return False
        
        # Core functionality tests
        self.test_dashboard_stats()
        self.test_notes_crud()
        self.test_events_crud()
        self.test_tasks_crud()
        self.test_habits_crud()
        self.test_alarms_crud()
        self.test_global_search()
        self.test_ai_task_extraction()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return False

def main():
    """Main test execution"""
    tester = PersonalAssistantAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": (tester.tests_passed/tester.tests_run*100) if tester.tests_run > 0 else 0,
        "test_details": tester.test_results
    }
    
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())