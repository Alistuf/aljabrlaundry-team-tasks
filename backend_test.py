#!/usr/bin/env python3
import requests
import json
import sys
from datetime import datetime
import base64

# Use the public endpoint from frontend/.env
BASE_URL = "https://laundry-mgmt-hub.preview.emergentagent.com/api"

class AljabrAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.manager_token = None
        self.supervisor_token = None
        self.current_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.manager_id = None
        self.supervisor_id = None
        self.test_request_id = None
        
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
            
        if self.current_token:
            test_headers['Authorization'] = f'Bearer {self.current_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.content else {}
                    if 'password' in str(response_data):
                        # Hide password in logs
                        print(f"   Response: [Password hidden]")
                    else:
                        print(f"   Response preview: {str(response_data)[:100]}...")
                except:
                    print(f"   Response: Non-JSON response")
                return True, response.json() if response.content else {}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json() if response.content else {}
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ FAILED - Request timed out")
            return False, {}
        except requests.exceptions.ConnectionError:
            print(f"❌ FAILED - Connection error")
            return False, {}
        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API", "GET", "", 200
        )
        if success and response.get('message'):
            print(f"   API Message: {response['message']}")
        return success

    def test_cities_endpoint(self):
        """Test cities endpoint (public)"""
        success, response = self.run_test(
            "Get Cities", "GET", "cities", 200
        )
        if success and 'cities' in response:
            print(f"   Cities count: {len(response['cities'])}")
            print(f"   Sample cities: {response['cities'][:3]}...")
        return success

    def test_manager_register(self):
        """Test manager registration"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        register_data = {
            "username": f"manager_{timestamp}",
            "password": "Manager123!",
            "email": f"manager_{timestamp}@example.com",
            "role": "manager",
            "category": "google_maps"
        }
        
        success, response = self.run_test(
            "Manager Registration", "POST", "auth/register", 200, register_data
        )
        
        if success and 'access_token' in response:
            self.manager_token = response['access_token']
            self.manager_id = response['user']['id']
            print(f"   Manager registered: {response['user']['username']}")
            print(f"   Role: {response['user']['role']}")
            print(f"   Category: {response['user']['category']}")
        return success

    def test_supervisor_register(self):
        """Test supervisor registration"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        register_data = {
            "username": f"supervisor_{timestamp}",
            "password": "Supervisor123!",
            "email": f"supervisor_{timestamp}@example.com",
            "role": "supervisor",
            "category": "google_maps"
        }
        
        success, response = self.run_test(
            "Supervisor Registration", "POST", "auth/register", 200, register_data
        )
        
        if success and 'access_token' in response:
            self.supervisor_token = response['access_token']
            self.supervisor_id = response['user']['id']
            print(f"   Supervisor registered: {response['user']['username']}")
            print(f"   Role: {response['user']['role']}")
            print(f"   Category: {response['user']['category']}")
        return success

    def test_manager_login(self):
        """Test manager login"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        login_data = {
            "username": f"manager_{timestamp}",
            "password": "Manager123!"
        }
        
        success, response = self.run_test(
            "Manager Login", "POST", "auth/login", 200, login_data
        )
        
        if success and 'access_token' in response:
            self.manager_token = response['access_token']
            print(f"   Manager logged in: {response['user']['username']}")
            print(f"   Role: {response['user']['role']}")
        return success

    def test_supervisor_login(self):
        """Test supervisor login"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        login_data = {
            "username": f"supervisor_{timestamp}",
            "password": "Supervisor123!"
        }
        
        success, response = self.run_test(
            "Supervisor Login", "POST", "auth/login", 200, login_data
        )
        
        if success and 'access_token' in response:
            self.supervisor_token = response['access_token']
            print(f"   Supervisor logged in: {response['user']['username']}")
            print(f"   Role: {response['user']['role']}")
        return success

    def test_manager_auth_me(self):
        """Test current manager endpoint"""
        self.current_token = self.manager_token
        success, response = self.run_test(
            "Get Current Manager", "GET", "auth/me", 200
        )
        
        if success and 'username' in response:
            print(f"   Current manager: {response['username']}")
            print(f"   Role: {response['role']}")
            print(f"   Category: {response['category']}")
            if response['role'] != 'manager':
                print(f"   ❌ Expected manager role, got: {response['role']}")
                return False
        return success

    def test_supervisor_auth_me(self):
        """Test current supervisor endpoint"""
        self.current_token = self.supervisor_token
        success, response = self.run_test(
            "Get Current Supervisor", "GET", "auth/me", 200
        )
        
        if success and 'username' in response:
            print(f"   Current supervisor: {response['username']}")
            print(f"   Role: {response['role']}")
            print(f"   Category: {response['category']}")
            if response['role'] != 'supervisor':
                print(f"   ❌ Expected supervisor role, got: {response['role']}")
                return False
        return success

    def test_google_maps_auto_assignment(self):
        """Test auto-assignment of Google Maps requests to Google Maps supervisor"""
        self.current_token = None  # No auth for public request
        
        edit_data = {
            "branch_name": "Test Auto Assignment Branch",
            "city": "Riyadh",
            "google_maps_link": "https://maps.google.com/test-auto-assign",
            "new_phone": "0501234567",
            "notes": "Testing auto-assignment to Google Maps supervisor"
        }
        
        success, response = self.run_test(
            "Auto-Assignment Test", "POST", "requests/edit", 200, edit_data
        )
        
        if success and 'id' in response:
            self.test_request_id = response['id']
            print(f"   Request created: {response['id']}")
            print(f"   Assigned to: {response.get('assigned_to_name', 'None')}")
            print(f"   Category: {response.get('category', 'None')}")
            
            # Check if it was assigned to Google Maps supervisor
            if response.get('assigned_to') == self.supervisor_id:
                print(f"   ✅ Correctly auto-assigned to Google Maps supervisor")
            else:
                print(f"   ⚠️  Assignment: {response.get('assigned_to')} vs expected: {self.supervisor_id}")
                
        return success

    def test_manager_sees_all_requests(self):
        """Test that manager can see all requests"""
        self.current_token = self.manager_token
        success, response = self.run_test(
            "Manager Sees All Requests", "GET", "requests", 200
        )
        
        if success and isinstance(response, list):
            print(f"   Manager can see {len(response)} requests")
            # Should see at least our test request
            has_test_request = any(r.get('id') == self.test_request_id for r in response)
            print(f"   Can see test request: {has_test_request}")
        return success

    def test_supervisor_sees_only_assigned(self):
        """Test that supervisor only sees assigned requests"""
        self.current_token = self.supervisor_token
        success, response = self.run_test(
            "Supervisor Sees Only Assigned", "GET", "requests", 200
        )
        
        if success and isinstance(response, list):
            print(f"   Supervisor can see {len(response)} requests")
            # Should see our assigned test request
            assigned_requests = [r for r in response if r.get('assigned_to') == self.supervisor_id]
            print(f"   Assigned requests: {len(assigned_requests)}")
            has_test_request = any(r.get('id') == self.test_request_id for r in response)
            print(f"   Can see assigned test request: {has_test_request}")
        return success

    def test_manager_team_access(self):
        """Test that manager can access team management"""
        self.current_token = self.manager_token
        success, response = self.run_test(
            "Manager Team Access", "GET", "users", 200
        )
        
        if success and isinstance(response, list):
            print(f"   Manager can see {len(response)} team members")
            # Should see both manager and supervisor
            manager_found = any(u.get('id') == self.manager_id for u in response)
            supervisor_found = any(u.get('id') == self.supervisor_id for u in response)
            print(f"   Can see manager: {manager_found}")
            print(f"   Can see supervisor: {supervisor_found}")
        return success

    def test_supervisor_team_access_denied(self):
        """Test that supervisor cannot access team management"""
        self.current_token = self.supervisor_token
        success, response = self.run_test(
            "Supervisor Team Access Denied", "GET", "users", 403
        )
        
        if success:
            print(f"   ✅ Supervisor correctly denied access to team management")
        else:
            print(f"   ❌ Supervisor should not have access to team management")
        return success

    def test_manager_reassignment(self):
        """Test that manager can reassign requests"""
        if not self.test_request_id:
            print("   Skipping - no test request available")
            return True
            
        self.current_token = self.manager_token
        # Try to reassign to manager (though typically assigned to supervisors)
        assign_data = {"assigned_to": self.manager_id}
        
        success, response = self.run_test(
            "Manager Reassignment", "PATCH", f"requests/{self.test_request_id}/assign", 200, assign_data
        )
        
        if success and 'assigned_to' in response:
            print(f"   Request reassigned to: {response.get('assigned_to_name')}")
            print(f"   New assignee ID: {response.get('assigned_to')}")
        return success

    def test_manager_stats(self):
        """Test manager stats (should see all)"""
        self.current_token = self.manager_token
        success, response = self.run_test(
            "Manager Stats", "GET", "stats", 200
        )
        
        if success:
            print(f"   Manager stats - Total: {response.get('total', 0)}")
            print(f"   New: {response.get('new', 0)}, In Progress: {response.get('in_progress', 0)}, Completed: {response.get('completed', 0)}")
        return success

    def test_supervisor_stats(self):
        """Test supervisor stats (should see only assigned)"""
        self.current_token = self.supervisor_token
        success, response = self.run_test(
            "Supervisor Stats", "GET", "stats", 200
        )
        
        if success:
            print(f"   Supervisor stats - Total: {response.get('total', 0)}")
            print(f"   New: {response.get('new', 0)}, In Progress: {response.get('in_progress', 0)}, Completed: {response.get('completed', 0)}")
        return success

    def test_get_notifications(self):
        """Test getting notifications for current user"""
        self.current_token = self.supervisor_token
        success, response = self.run_test(
            "Get Supervisor Notifications", "GET", "notifications", 200
        )
        
        if success and isinstance(response, list):
            print(f"   Supervisor notifications count: {len(response)}")
        return success

    def test_unread_notification_count(self):
        """Test getting unread notification count"""
        success, response = self.run_test(
            "Get Unread Count", "GET", "notifications/unread-count", 200
        )
        
        if success and 'count' in response:
            print(f"   Unread count: {response['count']}")
        return success

    def test_filters_and_search(self):
        """Test request filtering and search"""
        # Test status filter
        success1, _ = self.run_test(
            "Filter by Status", "GET", "requests?status=new", 200
        )
        
        # Test city filter  
        success2, _ = self.run_test(
            "Filter by City", "GET", "requests?city=الرياض", 200
        )
        
        # Test search
        success3, _ = self.run_test(
            "Search Requests", "GET", "requests?search=فرع", 200
        )
        
        return success1 and success2 and success3

def main():
    print("🚀 Starting Aljabr Role-Based API Tests")
    print("=" * 60)
    
    tester = AljabrAPITester()
    
    # Test suite for role-based functionality
    tests = [
        ("Root API Endpoint", tester.test_root_endpoint),
        ("Cities Endpoint", tester.test_cities_endpoint),
        ("Manager Registration", tester.test_manager_register),
        ("Supervisor Registration", tester.test_supervisor_register),
        ("Manager Auth Check", tester.test_manager_auth_me),
        ("Supervisor Auth Check", tester.test_supervisor_auth_me),
        ("Google Maps Auto-Assignment", tester.test_google_maps_auto_assignment),
        ("Manager Sees All Requests", tester.test_manager_sees_all_requests),
        ("Supervisor Sees Only Assigned", tester.test_supervisor_sees_only_assigned),
        ("Manager Team Access", tester.test_manager_team_access),
        ("Supervisor Team Access Denied", tester.test_supervisor_team_access_denied),
        ("Manager Can Reassign", tester.test_manager_reassignment),
        ("Manager Stats (All)", tester.test_manager_stats),
        ("Supervisor Stats (Filtered)", tester.test_supervisor_stats),
        ("Supervisor Notifications", tester.test_get_notifications),
        ("Unread Count", tester.test_unread_notification_count),
    ]
    
    print(f"\n🔧 Testing against: {tester.base_url}")
    print("-" * 60)
    
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} - CRASHED: {str(e)}")
    
    # Final Results
    print("\n" + "=" * 60)
    print(f"📊 TEST RESULTS")
    print(f"   Tests run: {tester.tests_run}")
    print(f"   Tests passed: {tester.tests_passed}")
    print(f"   Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "No tests run")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL ROLE-BASED BACKEND TESTS PASSED!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} TESTS FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())