#!/usr/bin/env python3
"""
Comprehensive API tests for Aljabr Branch Management System
Tests: Auth, CRUD operations, role-based access, filters
"""
import pytest
import requests
import os
import uuid

# Use local API by default. Override with API_BASE_URL for deployed smoke tests.
BASE_URL = os.environ.get(
    "API_BASE_URL",
    f"{os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')}/api"
)

# Test credentials - provided by main agent
MANAGER_CREDENTIALS = {"username": "manager1", "password": "manager123"}
SUPERVISOR_CREDENTIALS = {"username": "aalkhalf", "password": "super123"}


class TestHealthAndPublicEndpoints:
    """Test public endpoints that don't require authentication"""
    
    def test_api_root(self):
        """Test root API endpoint"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API Message: {data['message']}")
    
    def test_get_cities(self):
        """Test getting list of cities"""
        response = requests.get(f"{BASE_URL}/cities")
        assert response.status_code == 200
        data = response.json()
        assert "cities" in data
        assert len(data["cities"]) > 0
        assert "Riyadh" in data["cities"]
        print(f"Cities count: {len(data['cities'])}")
    
    def test_get_categories(self):
        """Test getting categories"""
        response = requests.get(f"{BASE_URL}/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_manager_login(self):
        """Test manager login with provided credentials"""
        response = requests.post(f"{BASE_URL}/auth/login", json=MANAGER_CREDENTIALS)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "manager"
        print(f"Manager logged in: {data['user']['username']}")
        
    def test_supervisor_login(self):
        """Test supervisor login with provided credentials"""
        response = requests.post(f"{BASE_URL}/auth/login", json=SUPERVISOR_CREDENTIALS)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "supervisor"
        print(f"Supervisor logged in: {data['user']['username']}")
    
    def test_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        assert response.status_code == 401


@pytest.fixture
def manager_token():
    """Get manager authentication token"""
    response = requests.post(f"{BASE_URL}/auth/login", json=MANAGER_CREDENTIALS)
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Manager login failed")


@pytest.fixture
def supervisor_token():
    """Get supervisor authentication token"""
    response = requests.post(f"{BASE_URL}/auth/login", json=SUPERVISOR_CREDENTIALS)
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Supervisor login failed")


@pytest.fixture
def manager_headers(manager_token):
    """Get headers with manager auth"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {manager_token}"
    }


@pytest.fixture
def supervisor_headers(supervisor_token):
    """Get headers with supervisor auth"""
    return {
        "Content-Type": "application/json", 
        "Authorization": f"Bearer {supervisor_token}"
    }


class TestManagerEndpoints:
    """Test endpoints that require manager access"""
    
    def test_manager_auth_me(self, manager_headers):
        """Test getting current manager info"""
        response = requests.get(f"{BASE_URL}/auth/me", headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "manager"
        assert data["username"] == MANAGER_CREDENTIALS["username"]
        
    def test_manager_get_all_requests(self, manager_headers):
        """Test manager can see all requests"""
        response = requests.get(f"{BASE_URL}/requests", headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Manager sees {len(data)} requests")
        
    def test_manager_get_stats(self, manager_headers):
        """Test manager can get stats for all requests"""
        response = requests.get(f"{BASE_URL}/stats", headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "new" in data
        assert "in_progress" in data
        assert "completed" in data
        print(f"Manager stats: total={data['total']}, new={data['new']}, in_progress={data['in_progress']}, completed={data['completed']}")
        
    def test_manager_get_users(self, manager_headers):
        """Test manager can access team management (all users)"""
        response = requests.get(f"{BASE_URL}/users", headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Manager can see {len(data)} team members")
        
    def test_manager_get_supervisors(self, manager_headers):
        """Test manager can get list of supervisors"""
        response = requests.get(f"{BASE_URL}/users/supervisors", headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} supervisors")
        
    def test_manager_get_notifications(self, manager_headers):
        """Test manager can get notifications"""
        response = requests.get(f"{BASE_URL}/notifications", headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_manager_unread_count(self, manager_headers):
        """Test manager can get unread notification count"""
        response = requests.get(f"{BASE_URL}/notifications/unread-count", headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        assert "count" in data


class TestSupervisorEndpoints:
    """Test endpoints for supervisor role"""
    
    def test_supervisor_auth_me(self, supervisor_headers):
        """Test getting current supervisor info"""
        response = requests.get(f"{BASE_URL}/auth/me", headers=supervisor_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "supervisor"
        assert data["username"] == SUPERVISOR_CREDENTIALS["username"]
        
    def test_supervisor_get_assigned_requests(self, supervisor_headers):
        """Test supervisor can only see assigned requests"""
        response = requests.get(f"{BASE_URL}/requests", headers=supervisor_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Supervisor sees {len(data)} assigned requests")
        
    def test_supervisor_get_stats(self, supervisor_headers):
        """Test supervisor can get stats for assigned requests only"""
        response = requests.get(f"{BASE_URL}/stats", headers=supervisor_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        print(f"Supervisor stats: total={data['total']}")
        
    def test_supervisor_denied_users_access(self, supervisor_headers):
        """Test supervisor cannot access team management"""
        response = requests.get(f"{BASE_URL}/users", headers=supervisor_headers)
        assert response.status_code == 403  # Forbidden for supervisors
        
    def test_supervisor_get_notifications(self, supervisor_headers):
        """Test supervisor can get their notifications"""
        response = requests.get(f"{BASE_URL}/notifications", headers=supervisor_headers)
        assert response.status_code == 200


class TestPublicBranchRequests:
    """Test public branch request submission (no auth required)"""
    
    def test_create_edit_branch_request(self):
        """Test creating an edit branch request"""
        request_data = {
            "branch_name": f"TEST_Edit_Branch_{uuid.uuid4().hex[:8]}",
            "city": "Riyadh",
            "google_maps_link": "https://maps.google.com/test-edit-123",
            "new_phone": "0501234567",
            "notes": "Testing edit branch request"
        }
        
        response = requests.post(f"{BASE_URL}/requests/edit", json=request_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["request_type"] == "edit"
        assert data["branch_name"] == request_data["branch_name"]
        assert data["city"] == request_data["city"]
        assert data["status"] == "new"
        print(f"Edit request created: {data['id']}")
        return data["id"]
        
    def test_create_new_branch_request(self):
        """Test creating a new branch request"""
        # Create a minimal base64 image for testing
        test_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        request_data = {
            "branch_name": f"TEST_New_Branch_{uuid.uuid4().hex[:8]}",
            "city": "Jeddah",
            "location_link": "https://maps.google.com/test-new-456",
            "phone_number": "0559876543",
            "photos": [test_image] * 5  # Minimum 5 photos required
        }
        
        response = requests.post(f"{BASE_URL}/requests/new", json=request_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["request_type"] == "new"
        assert data["branch_name"] == request_data["branch_name"]
        assert data["status"] == "new"
        assert len(data.get("photos", [])) == 5
        print(f"New branch request created: {data['id']}")
        return data["id"]


class TestFiltersAndSearch:
    """Test filtering and search functionality"""
    
    def test_filter_by_status(self, manager_headers):
        """Test filtering requests by status"""
        response = requests.get(f"{BASE_URL}/requests?status=new", headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        # All returned requests should have status=new
        for request in data:
            assert request["status"] == "new"
            
    def test_filter_by_city(self, manager_headers):
        """Test filtering requests by city"""
        response = requests.get(f"{BASE_URL}/requests?city=Riyadh", headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        # All returned requests should have city=Riyadh
        for request in data:
            assert request["city"] == "Riyadh"
            
    def test_search_by_branch_name(self, manager_headers):
        """Test searching requests by branch name"""
        response = requests.get(f"{BASE_URL}/requests?search=TEST", headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestRequestDetailAndStatusUpdate:
    """Test request detail view and status updates"""
    
    def test_get_request_detail(self, manager_headers):
        """Test getting request detail"""
        # First get list of requests
        list_response = requests.get(f"{BASE_URL}/requests", headers=manager_headers)
        assert list_response.status_code == 200
        requests_list = list_response.json()
        
        if len(requests_list) > 0:
            request_id = requests_list[0]["id"]
            response = requests.get(f"{BASE_URL}/requests/{request_id}", headers=manager_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == request_id
            print(f"Got request detail for: {data['branch_name']}")
            
    def test_update_request_status(self, manager_headers):
        """Test updating request status"""
        # First get a request
        list_response = requests.get(f"{BASE_URL}/requests", headers=manager_headers)
        requests_list = list_response.json()
        
        if len(requests_list) > 0:
            request_id = requests_list[0]["id"]
            original_status = requests_list[0]["status"]
            
            # Cycle status: new -> in_progress -> completed -> new
            new_status = "in_progress" if original_status == "new" else "completed" if original_status == "in_progress" else "new"
            
            response = requests.patch(
                f"{BASE_URL}/requests/{request_id}/status",
                json={"status": new_status},
                headers=manager_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == new_status
            print(f"Status updated from {original_status} to {new_status}")


class TestTeamManagement:
    """Test team management features (Manager only)"""
    
    def test_manager_can_register_new_user(self, manager_headers):
        """Test manager can register a new team member"""
        new_user = {
            "username": f"TEST_user_{uuid.uuid4().hex[:8]}",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "password": "TestPass123!",
            "role": "supervisor",
            "category": "google_maps"
        }
        
        response = requests.post(f"{BASE_URL}/auth/register", json=new_user)
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert data["user"]["username"] == new_user["username"]
        assert data["user"]["role"] == "supervisor"
        print(f"New team member registered: {data['user']['username']}")


class TestProfile:
    """Test profile management"""
    
    def test_get_profile(self, manager_headers):
        """Test getting user profile"""
        response = requests.get(f"{BASE_URL}/profile", headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        assert "username" in data
        assert "email" in data
        
    def test_update_profile(self, manager_headers):
        """Test updating user profile"""
        update_data = {
            "name": "Test Manager Name"
        }
        
        response = requests.patch(f"{BASE_URL}/profile", json=update_data, headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
