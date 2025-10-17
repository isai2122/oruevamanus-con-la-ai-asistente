#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Asistente-Definitivo
Tests all endpoints including authentication, CRUD operations, and AI features
"""

import requests
import sys
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuration
BACKEND_URL = "https://asistente-definitivo.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class AsistenteDefinitivoTester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_resources = {
            'notes': [],
            'tasks': [],
            'events': [],
            'projects': []
        }

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

    def make_request(self, method: str, endpoint: str, data: Any = None, files: Any = None) -> tuple:
        """Make HTTP request with proper headers"""
        url = f"{API_BASE}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if files:
            headers.pop('Content-Type', None)  # Let requests set it for multipart
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                return False, f"Unsupported method: {method}", None
            
            return True, response.status_code, response.json() if response.content else {}
        except requests.exceptions.RequestException as e:
            return False, f"Request failed: {str(e)}", None
        except json.JSONDecodeError:
            return False, f"Invalid JSON response", None

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        success, status_code, data = self.make_request('GET', '/')
        self.log_test(
            "Root endpoint (/api/)",
            success and status_code == 200,
            f"Status: {status_code}" if success else str(status_code),
            data
        )
        
        # Test health endpoint
        success, status_code, data = self.make_request('GET', '/health')
        self.log_test(
            "Health check (/api/health)",
            success and status_code == 200,
            f"Status: {status_code}" if success else str(status_code),
            data
        )

    def test_authentication(self):
        """Test user registration and login"""
        print("\n🔍 Testing Authentication...")
        
        # Generate unique test user
        timestamp = int(time.time())
        test_email = f"test_user_{timestamp}@example.com"
        test_password = "TestPassword123!"
        test_name = f"Test User {timestamp}"
        
        # Test user registration
        register_data = {
            "email": test_email,
            "password": test_password,
            "full_name": test_name,
            "device_id": f"test_device_{timestamp}"
        }
        
        success, status_code, data = self.make_request('POST', '/auth/register', register_data)
        register_success = success and status_code == 200 and 'access_token' in data
        self.log_test(
            "User registration",
            register_success,
            f"Status: {status_code}" if success else str(status_code),
            data
        )
        
        if register_success:
            self.token = data['access_token']
            self.user_id = data['user']['id']
        
        # Test user login
        login_data = {
            "email": test_email,
            "password": test_password,
            "device_id": f"test_device_{timestamp}"
        }
        
        success, status_code, data = self.make_request('POST', '/auth/login', login_data)
        login_success = success and status_code == 200 and 'access_token' in data
        self.log_test(
            "User login",
            login_success,
            f"Status: {status_code}" if success else str(status_code),
            data
        )
        
        if login_success and not self.token:
            self.token = data['access_token']
            self.user_id = data['user']['id']
        
        # Test invalid login
        invalid_login_data = {
            "email": test_email,
            "password": "wrong_password",
            "device_id": f"test_device_{timestamp}"
        }
        
        success, status_code, data = self.make_request('POST', '/auth/login', invalid_login_data)
        self.log_test(
            "Invalid login rejection",
            success and status_code == 401,
            f"Status: {status_code}" if success else str(status_code),
            data
        )

    def test_notes_crud(self):
        """Test notes CRUD operations"""
        print("\n🔍 Testing Notes CRUD...")
        
        if not self.token:
            self.log_test("Notes CRUD", False, "No authentication token available")
            return
        
        # Create note
        note_data = {
            "title": "Test Note with AI Analysis",
            "content": "This is a comprehensive test note that should trigger AI analysis. I need to complete the following tasks: 1. Review the quarterly report, 2. Schedule meeting with team, 3. Update project documentation. The deadline is next Friday and it's very important for the company's success.",
            "tags": ["test", "important", "ai-analysis"],
            "folder": "test",
            "type": "text"
        }
        
        success, status_code, data = self.make_request('POST', '/notes', note_data)
        create_success = success and status_code == 200 and 'id' in data
        self.log_test(
            "Create note with AI analysis",
            create_success,
            f"Status: {status_code}" if success else str(status_code),
            data
        )
        
        note_id = None
        if create_success:
            note_id = data['id']
            self.created_resources['notes'].append(note_id)
            
            # Check if AI analysis was performed
            has_ai_summary = bool(data.get('ai_summary'))
            has_extracted_tasks = bool(data.get('extracted_tasks'))
            self.log_test(
                "AI summary generation",
                has_ai_summary,
                f"AI summary present: {has_ai_summary}",
                {'ai_summary': data.get('ai_summary', 'None')}
            )
            self.log_test(
                "Task extraction from note",
                has_extracted_tasks,
                f"Extracted tasks: {len(data.get('extracted_tasks', []))}",
                {'extracted_tasks': data.get('extracted_tasks', [])}
            )
        
        # Get notes
        success, status_code, data = self.make_request('GET', '/notes')
        get_success = success and status_code == 200 and isinstance(data, list)
        self.log_test(
            "Get all notes",
            get_success,
            f"Status: {status_code}, Count: {len(data) if get_success else 0}" if success else str(status_code),
            data
        )
        
        # Search notes
        success, status_code, data = self.make_request('GET', '/notes?search=test')
        search_success = success and status_code == 200 and isinstance(data, list)
        self.log_test(
            "Search notes",
            search_success,
            f"Status: {status_code}, Results: {len(data) if search_success else 0}" if success else str(status_code),
            data
        )
        
        # Update note
        if note_id:
            update_data = {
                "title": "Updated Test Note",
                "content": "Updated content with new information",
                "tags": ["test", "updated"],
                "folder": "test",
                "type": "text"
            }
            
            success, status_code, data = self.make_request('PUT', f'/notes/{note_id}', update_data)
            self.log_test(
                "Update note",
                success and status_code == 200,
                f"Status: {status_code}" if success else str(status_code),
                data
            )

    def test_tasks_crud(self):
        """Test tasks CRUD operations"""
        print("\n🔍 Testing Tasks CRUD...")
        
        if not self.token:
            self.log_test("Tasks CRUD", False, "No authentication token available")
            return
        
        # Create task
        due_date = (datetime.now() + timedelta(days=7)).isoformat()
        task_data = {
            "title": "Test Task with Priority",
            "description": "This is a test task to verify CRUD operations",
            "priority": "high",
            "due_date": due_date,
            "category": "test",
            "estimated_time": 120
        }
        
        success, status_code, data = self.make_request('POST', '/tasks', task_data)
        create_success = success and status_code == 200 and 'id' in data
        self.log_test(
            "Create task",
            create_success,
            f"Status: {status_code}" if success else str(status_code),
            data
        )
        
        task_id = None
        if create_success:
            task_id = data['id']
            self.created_resources['tasks'].append(task_id)
        
        # Get tasks
        success, status_code, data = self.make_request('GET', '/tasks')
        get_success = success and status_code == 200 and isinstance(data, list)
        self.log_test(
            "Get all tasks",
            get_success,
            f"Status: {status_code}, Count: {len(data) if get_success else 0}" if success else str(status_code),
            data
        )
        
        # Filter tasks by priority
        success, status_code, data = self.make_request('GET', '/tasks?priority=high')
        filter_success = success and status_code == 200 and isinstance(data, list)
        self.log_test(
            "Filter tasks by priority",
            filter_success,
            f"Status: {status_code}, High priority tasks: {len(data) if filter_success else 0}" if success else str(status_code),
            data
        )
        
        # Complete task
        if task_id:
            success, status_code, data = self.make_request('PUT', f'/tasks/{task_id}/complete')
            self.log_test(
                "Complete task",
                success and status_code == 200,
                f"Status: {status_code}" if success else str(status_code),
                data
            )
            
            # Verify task is completed
            success, status_code, data = self.make_request('GET', '/tasks?completed=true')
            completed_success = success and status_code == 200 and isinstance(data, list)
            self.log_test(
                "Get completed tasks",
                completed_success,
                f"Status: {status_code}, Completed tasks: {len(data) if completed_success else 0}" if success else str(status_code),
                data
            )

    def test_calendar_events(self):
        """Test calendar events CRUD operations"""
        print("\n🔍 Testing Calendar Events...")
        
        if not self.token:
            self.log_test("Calendar Events", False, "No authentication token available")
            return
        
        # Create event
        start_date = (datetime.now() + timedelta(days=1)).isoformat()
        end_date = (datetime.now() + timedelta(days=1, hours=2)).isoformat()
        
        event_data = {
            "title": "Test Meeting",
            "description": "Important test meeting",
            "start_date": start_date,
            "end_date": end_date,
            "all_day": False,
            "location": "Conference Room A",
            "category": "meeting",
            "color": "#6366f1",
            "reminder_minutes": 30
        }
        
        success, status_code, data = self.make_request('POST', '/events', event_data)
        create_success = success and status_code == 200 and 'id' in data
        self.log_test(
            "Create calendar event",
            create_success,
            f"Status: {status_code}" if success else str(status_code),
            data
        )
        
        event_id = None
        if create_success:
            event_id = data['id']
            self.created_resources['events'].append(event_id)
        
        # Get events
        success, status_code, data = self.make_request('GET', '/events')
        get_success = success and status_code == 200 and isinstance(data, list)
        self.log_test(
            "Get all events",
            get_success,
            f"Status: {status_code}, Count: {len(data) if get_success else 0}" if success else str(status_code),
            data
        )
        
        # Get events with date range
        start_range = datetime.now().isoformat()
        end_range = (datetime.now() + timedelta(days=30)).isoformat()
        success, status_code, data = self.make_request('GET', f'/events?start_date={start_range}&end_date={end_range}')
        range_success = success and status_code == 200 and isinstance(data, list)
        self.log_test(
            "Get events by date range",
            range_success,
            f"Status: {status_code}, Events in range: {len(data) if range_success else 0}" if success else str(status_code),
            data
        )

    def test_ai_features(self):
        """Test AI-powered features"""
        print("\n🔍 Testing AI Features...")
        
        if not self.token:
            self.log_test("AI Features", False, "No authentication token available")
            return
        
        # Test AI Chat
        chat_data = {
            "text": "Hola, ¿puedes ayudarme a organizar mis tareas de hoy? Necesito revisar documentos, hacer llamadas y preparar una presentación.",
            "context": "Usuario solicitando ayuda con organización"
        }
        
        success, status_code, data = self.make_request('POST', '/ai/chat', chat_data)
        chat_success = success and status_code == 200 and 'response' in data
        self.log_test(
            "AI Chat with GPT-4o",
            chat_success,
            f"Status: {status_code}, Response length: {len(data.get('response', '')) if chat_success else 0}" if success else str(status_code),
            data
        )
        
        # Test task extraction
        extract_text = "Necesito completar las siguientes actividades esta semana: 1. Revisar el informe trimestral y hacer correcciones, 2. Programar reunión con el equipo de desarrollo para el viernes, 3. Actualizar la documentación del proyecto antes del lunes, 4. Enviar propuesta al cliente antes del miércoles."
        
        # Using form data as expected by the endpoint
        import urllib.parse
        form_data = urllib.parse.urlencode({
            'text': extract_text,
            'auto_create': 'false'
        })
        
        headers = {'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/x-www-form-urlencoded'}
        
        try:
            response = requests.post(f"{API_BASE}/ai/extract-tasks", data=form_data, headers=headers)
            extract_success = response.status_code == 200
            extract_data = response.json() if response.content else {}
            
            self.log_test(
                "AI Task Extraction",
                extract_success and 'extracted_tasks' in extract_data,
                f"Status: {response.status_code}, Tasks extracted: {len(extract_data.get('extracted_tasks', []))}" if extract_success else f"Status: {response.status_code}",
                extract_data
            )
        except Exception as e:
            self.log_test("AI Task Extraction", False, f"Request failed: {str(e)}")
        
        # Test text analysis
        analysis_text = "Este documento contiene información importante sobre el proyecto Q4. Las fechas clave son: 15 de diciembre para la entrega inicial, 22 de diciembre para revisión, y 30 de diciembre para entrega final. Los contactos principales son Juan Pérez (juan@empresa.com) y María García (maria@empresa.com). El presupuesto asignado es de $50,000 USD."
        
        form_data = urllib.parse.urlencode({'text': analysis_text})
        
        try:
            response = requests.post(f"{API_BASE}/ai/analyze-text", data=form_data, headers=headers)
            analysis_success = response.status_code == 200
            analysis_data = response.json() if response.content else {}
            
            self.log_test(
                "AI Text Analysis",
                analysis_success and ('summary' in analysis_data or 'analysis_text' in analysis_data),
                f"Status: {response.status_code}, Analysis available: {bool(analysis_data.get('summary') or analysis_data.get('analysis_text'))}" if analysis_success else f"Status: {response.status_code}",
                analysis_data
            )
        except Exception as e:
            self.log_test("AI Text Analysis", False, f"Request failed: {str(e)}")

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n🔍 Testing Dashboard Statistics...")
        
        if not self.token:
            self.log_test("Dashboard Stats", False, "No authentication token available")
            return
        
        success, status_code, data = self.make_request('GET', '/dashboard/stats')
        stats_success = success and status_code == 200
        
        if stats_success:
            required_fields = ['notes_count', 'tasks_count', 'events_count', 'projects_count', 'completion_rate']
            has_all_fields = all(field in data for field in required_fields)
            
            self.log_test(
                "Dashboard statistics",
                has_all_fields,
                f"Status: {status_code}, Fields present: {has_all_fields}" if success else str(status_code),
                data
            )
        else:
            self.log_test(
                "Dashboard statistics",
                False,
                f"Status: {status_code}" if success else str(status_code),
                data
            )

    def test_search_functionality(self):
        """Test global search functionality"""
        print("\n🔍 Testing Search Functionality...")
        
        if not self.token:
            self.log_test("Search Functionality", False, "No authentication token available")
            return
        
        # Test global search
        success, status_code, data = self.make_request('GET', '/search?query=test')
        search_success = success and status_code == 200
        
        if search_success:
            expected_categories = ['notes', 'tasks', 'events', 'projects']
            has_all_categories = all(category in data for category in expected_categories)
            
            self.log_test(
                "Global search functionality",
                has_all_categories,
                f"Status: {status_code}, Categories: {list(data.keys()) if isinstance(data, dict) else 'Invalid format'}" if success else str(status_code),
                data
            )
        else:
            self.log_test(
                "Global search functionality",
                False,
                f"Status: {status_code}" if success else str(status_code),
                data
            )

    def test_assistant_config(self):
        """Test assistant configuration"""
        print("\n🔍 Testing Assistant Configuration...")
        
        if not self.token:
            self.log_test("Assistant Config", False, "No authentication token available")
            return
        
        # Get current config
        success, status_code, data = self.make_request('GET', '/assistant/config')
        get_success = success and status_code == 200
        self.log_test(
            "Get assistant configuration",
            get_success,
            f"Status: {status_code}" if success else str(status_code),
            data
        )
        
        # Update config
        new_config = {
            "name": "Mi Asistente Personalizado",
            "photo": "",
            "tone": "energetico"
        }
        
        success, status_code, data = self.make_request('PUT', '/assistant/config', new_config)
        self.log_test(
            "Update assistant configuration",
            success and status_code == 200,
            f"Status: {status_code}" if success else str(status_code),
            data
        )

    def cleanup_resources(self):
        """Clean up created test resources"""
        print("\n🧹 Cleaning up test resources...")
        
        if not self.token:
            return
        
        # Delete created notes
        for note_id in self.created_resources['notes']:
            success, status_code, _ = self.make_request('DELETE', f'/notes/{note_id}')
            if success and status_code == 200:
                print(f"✅ Deleted note {note_id}")
            else:
                print(f"❌ Failed to delete note {note_id}")
        
        # Delete created tasks
        for task_id in self.created_resources['tasks']:
            success, status_code, _ = self.make_request('DELETE', f'/tasks/{task_id}')
            if success and status_code == 200:
                print(f"✅ Deleted task {task_id}")
            else:
                print(f"❌ Failed to delete task {task_id}")
        
        # Delete created events
        for event_id in self.created_resources['events']:
            success, status_code, _ = self.make_request('DELETE', f'/events/{event_id}')
            if success and status_code == 200:
                print(f"✅ Deleted event {event_id}")
            else:
                print(f"❌ Failed to delete event {event_id}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Asistente-Definitivo Backend API Tests")
        print(f"🔗 Testing against: {BACKEND_URL}")
        print("=" * 60)
        
        # Run test suites
        self.test_health_check()
        self.test_authentication()
        self.test_notes_crud()
        self.test_tasks_crud()
        self.test_calendar_events()
        self.test_ai_features()
        self.test_dashboard_stats()
        self.test_search_functionality()
        self.test_assistant_config()
        
        # Cleanup
        self.cleanup_resources()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
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
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = AsistenteDefinitivoTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        'timestamp': datetime.now().isoformat(),
        'backend_url': BACKEND_URL,
        'total_tests': tester.tests_run,
        'passed_tests': tester.tests_passed,
        'failed_tests': tester.tests_run - tester.tests_passed,
        'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
        'test_details': tester.test_results
    }
    
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())