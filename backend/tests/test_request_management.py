#!/usr/bin/env python3
"""
Comprehensive API tests for Request Management System
Tests: Request Types CRUD, Workflow Requests, File Uploads, Workflow Steps
"""
import pytest
import requests
import os
import uuid
import base64

# Use local API by default. Override with API_BASE_URL for deployed smoke tests.
BASE_URL = os.environ.get(
    "API_BASE_URL",
    f"{os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')}/api"
)

# Test credentials - Manager has full access
MANAGER_CREDENTIALS = {"username": "manager1", "password": "manager123"}

# Test data tracking for cleanup
created_request_types = []
created_workflow_requests = []


@pytest.fixture(scope="module")
def manager_token():
    """Get manager authentication token"""
    response = requests.post(f"{BASE_URL}/auth/login", json=MANAGER_CREDENTIALS)
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Manager login failed - cannot proceed with tests")


@pytest.fixture(scope="module")
def manager_headers(manager_token):
    """Get headers with manager auth"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {manager_token}"
    }


@pytest.fixture(scope="module")
def users_list(manager_headers):
    """Get list of users for workflow step assignment"""
    response = requests.get(f"{BASE_URL}/users", headers=manager_headers)
    if response.status_code == 200:
        return response.json()
    return []


# ==================== REQUEST TYPES TESTS ====================

class TestRequestTypesEndpoints:
    """Test Request Types CRUD operations (Admin only)"""
    
    def test_get_request_types_empty_or_list(self, manager_headers):
        """Test getting list of request types"""
        response = requests.get(f"{BASE_URL}/request-types", headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} existing request types")
    
    def test_create_request_type_basic(self, manager_headers):
        """Test creating a basic request type without custom fields or workflow"""
        request_type_data = {
            "name": f"TEST_Basic_Type_{uuid.uuid4().hex[:8]}",
            "description": "A basic test request type",
            "is_active": True,
            "custom_fields": [],
            "workflow_steps": []
        }
        
        response = requests.post(f"{BASE_URL}/request-types", json=request_type_data, headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["name"] == request_type_data["name"]
        assert data["description"] == request_type_data["description"]
        assert data["is_active"] == True
        assert data["custom_fields"] == []
        assert data["workflow_steps"] == []
        
        created_request_types.append(data["id"])
        print(f"Created basic request type: {data['id']}")
        return data
    
    def test_create_request_type_with_custom_fields(self, manager_headers):
        """Test creating a request type with custom fields"""
        request_type_data = {
            "name": f"TEST_CustomFields_Type_{uuid.uuid4().hex[:8]}",
            "description": "Request type with custom fields",
            "is_active": True,
            "custom_fields": [
                {
                    "id": f"field-{uuid.uuid4().hex[:8]}",
                    "name": "Branch Name",
                    "field_type": "text",
                    "required": True,
                    "options": [],
                    "description": "Enter branch name"
                },
                {
                    "id": f"field-{uuid.uuid4().hex[:8]}",
                    "name": "Priority",
                    "field_type": "dropdown",
                    "required": True,
                    "options": ["Low", "Medium", "High"],
                    "description": "Select priority"
                },
                {
                    "id": f"field-{uuid.uuid4().hex[:8]}",
                    "name": "Quantity",
                    "field_type": "number",
                    "required": False,
                    "options": [],
                    "description": "Enter quantity"
                }
            ],
            "workflow_steps": []
        }
        
        response = requests.post(f"{BASE_URL}/request-types", json=request_type_data, headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["custom_fields"]) == 3
        assert data["custom_fields"][0]["name"] == "Branch Name"
        assert data["custom_fields"][1]["field_type"] == "dropdown"
        assert data["custom_fields"][1]["options"] == ["Low", "Medium", "High"]
        
        created_request_types.append(data["id"])
        print(f"Created request type with custom fields: {data['id']}")
        return data
    
    def test_create_request_type_with_workflow_steps(self, manager_headers, users_list):
        """Test creating a request type with workflow steps"""
        # Get a user to assign to workflow step
        assignee_id = users_list[0]["id"] if users_list else None
        assignee_name = users_list[0].get("name") or users_list[0]["username"] if users_list else None
        
        request_type_data = {
            "name": f"TEST_Workflow_Type_{uuid.uuid4().hex[:8]}",
            "description": "Request type with multi-step workflow",
            "is_active": True,
            "custom_fields": [
                {
                    "id": f"field-{uuid.uuid4().hex[:8]}",
                    "name": "Request Details",
                    "field_type": "text",
                    "required": True,
                    "options": [],
                    "description": ""
                }
            ],
            "workflow_steps": [
                {
                    "id": f"step-{uuid.uuid4().hex[:8]}",
                    "step_number": 1,
                    "name": "Initial Review",
                    "description": "Review the request",
                    "assigned_to": assignee_id,
                    "assigned_to_name": assignee_name,
                    "requires_file": True,
                    "allowed_file_types": ["pdf", "xlsx", "xls"]
                },
                {
                    "id": f"step-{uuid.uuid4().hex[:8]}",
                    "step_number": 2,
                    "name": "Final Approval",
                    "description": "Final approval step",
                    "assigned_to": assignee_id,
                    "assigned_to_name": assignee_name,
                    "requires_file": True,
                    "allowed_file_types": ["pdf"]
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/request-types", json=request_type_data, headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["workflow_steps"]) == 2
        assert data["workflow_steps"][0]["step_number"] == 1
        assert data["workflow_steps"][0]["name"] == "Initial Review"
        assert data["workflow_steps"][1]["step_number"] == 2
        
        created_request_types.append(data["id"])
        print(f"Created request type with workflow: {data['id']}")
        return data
    
    def test_get_request_type_by_id(self, manager_headers):
        """Test getting a specific request type by ID"""
        # First create a request type
        create_data = {
            "name": f"TEST_GetById_{uuid.uuid4().hex[:8]}",
            "description": "Test get by ID",
            "is_active": True,
            "custom_fields": [],
            "workflow_steps": []
        }
        create_response = requests.post(f"{BASE_URL}/request-types", json=create_data, headers=manager_headers)
        assert create_response.status_code == 200
        created = create_response.json()
        created_request_types.append(created["id"])
        
        # Now get it by ID
        response = requests.get(f"{BASE_URL}/request-types/{created['id']}", headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == created["id"]
        assert data["name"] == create_data["name"]
        print(f"Successfully retrieved request type: {data['id']}")
    
    def test_update_request_type(self, manager_headers):
        """Test updating a request type"""
        # First create a request type
        create_data = {
            "name": f"TEST_Update_{uuid.uuid4().hex[:8]}",
            "description": "Original description",
            "is_active": True,
            "custom_fields": [],
            "workflow_steps": []
        }
        create_response = requests.post(f"{BASE_URL}/request-types", json=create_data, headers=manager_headers)
        assert create_response.status_code == 200
        created = create_response.json()
        created_request_types.append(created["id"])
        
        # Update it
        update_data = {
            "name": f"TEST_Updated_{uuid.uuid4().hex[:8]}",
            "description": "Updated description",
            "is_active": False
        }
        response = requests.patch(f"{BASE_URL}/request-types/{created['id']}", json=update_data, headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == update_data["name"]
        assert data["description"] == update_data["description"]
        assert data["is_active"] == False
        print(f"Successfully updated request type: {data['id']}")
    
    def test_get_active_request_types_only(self, manager_headers):
        """Test filtering for active request types only"""
        response = requests.get(f"{BASE_URL}/request-types?active_only=true", headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        
        # All returned types should be active
        for rt in data:
            assert rt["is_active"] == True
        print(f"Found {len(data)} active request types")
    
    def test_delete_request_type(self, manager_headers):
        """Test deleting a request type"""
        # First create a request type
        create_data = {
            "name": f"TEST_Delete_{uuid.uuid4().hex[:8]}",
            "description": "To be deleted",
            "is_active": True,
            "custom_fields": [],
            "workflow_steps": []
        }
        create_response = requests.post(f"{BASE_URL}/request-types", json=create_data, headers=manager_headers)
        assert create_response.status_code == 200
        created = create_response.json()
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/request-types/{created['id']}", headers=manager_headers)
        assert response.status_code == 200
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/request-types/{created['id']}", headers=manager_headers)
        assert get_response.status_code == 404
        print(f"Successfully deleted request type: {created['id']}")


# ==================== WORKFLOW REQUESTS TESTS ====================

class TestWorkflowRequestsEndpoints:
    """Test Workflow Requests CRUD operations"""
    
    @pytest.fixture(scope="class")
    def test_request_type(self, manager_headers, users_list):
        """Create a request type for testing workflow requests"""
        assignee_id = users_list[0]["id"] if users_list else None
        assignee_name = users_list[0].get("name") or users_list[0]["username"] if users_list else None
        
        request_type_data = {
            "name": f"TEST_WorkflowTest_Type_{uuid.uuid4().hex[:8]}",
            "description": "Request type for workflow testing",
            "is_active": True,
            "custom_fields": [
                {
                    "id": "field-branch",
                    "name": "Branch Name",
                    "field_type": "text",
                    "required": True,
                    "options": [],
                    "description": ""
                },
                {
                    "id": "field-priority",
                    "name": "Priority",
                    "field_type": "dropdown",
                    "required": False,
                    "options": ["Low", "Medium", "High"],
                    "description": ""
                }
            ],
            "workflow_steps": [
                {
                    "id": "step-1",
                    "step_number": 1,
                    "name": "Marketing Review",
                    "description": "Marketing team reviews the request",
                    "assigned_to": assignee_id,
                    "assigned_to_name": assignee_name,
                    "requires_file": True,
                    "allowed_file_types": ["pdf", "xlsx", "xls"]
                },
                {
                    "id": "step-2",
                    "step_number": 2,
                    "name": "Final Approval",
                    "description": "Final approval and completion",
                    "assigned_to": assignee_id,
                    "assigned_to_name": assignee_name,
                    "requires_file": True,
                    "allowed_file_types": ["pdf"]
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/request-types", json=request_type_data, headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        created_request_types.append(data["id"])
        return data
    
    def test_create_workflow_request(self, manager_headers, test_request_type):
        """Test creating a new workflow request"""
        request_data = {
            "request_type_id": test_request_type["id"],
            "title": f"TEST_Workflow_Request_{uuid.uuid4().hex[:8]}",
            "description": "Test workflow request description",
            "custom_field_values": {
                "field-branch": "Test Branch Riyadh",
                "field-priority": "High"
            }
        }
        
        response = requests.post(f"{BASE_URL}/workflow-requests", json=request_data, headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["title"] == request_data["title"]
        assert data["request_type_id"] == test_request_type["id"]
        assert data["status"] == "pending"
        assert data["current_step"] == 1
        assert data["total_steps"] == 2
        assert data["custom_field_values"]["field-branch"] == "Test Branch Riyadh"
        
        created_workflow_requests.append(data["id"])
        print(f"Created workflow request: {data['id']}")
        return data
    
    def test_create_workflow_request_missing_required_field(self, manager_headers, test_request_type):
        """Test creating a workflow request without required field fails"""
        request_data = {
            "request_type_id": test_request_type["id"],
            "title": f"TEST_Missing_Field_{uuid.uuid4().hex[:8]}",
            "description": "Test missing required field",
            "custom_field_values": {
                # Missing required "field-branch"
                "field-priority": "Low"
            }
        }
        
        response = requests.post(f"{BASE_URL}/workflow-requests", json=request_data, headers=manager_headers)
        assert response.status_code == 400
        print("Correctly rejected request with missing required field")
    
    def test_get_workflow_requests_list(self, manager_headers):
        """Test getting list of workflow requests"""
        response = requests.get(f"{BASE_URL}/workflow-requests", headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} workflow requests")
    
    def test_get_my_submissions(self, manager_headers, test_request_type):
        """Test getting only my submitted requests"""
        # First create a request
        request_data = {
            "request_type_id": test_request_type["id"],
            "title": f"TEST_MySubmission_{uuid.uuid4().hex[:8]}",
            "description": "My submission test",
            "custom_field_values": {
                "field-branch": "My Branch"
            }
        }
        create_response = requests.post(f"{BASE_URL}/workflow-requests", json=request_data, headers=manager_headers)
        assert create_response.status_code == 200
        created = create_response.json()
        created_workflow_requests.append(created["id"])
        
        # Get my submissions
        response = requests.get(f"{BASE_URL}/workflow-requests?my_submissions=true", headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify our created request is in the list
        request_ids = [r["id"] for r in data]
        assert created["id"] in request_ids
        print(f"Found {len(data)} of my submissions")
    
    def test_get_workflow_request_by_id(self, manager_headers, test_request_type):
        """Test getting a specific workflow request by ID"""
        # First create a request
        request_data = {
            "request_type_id": test_request_type["id"],
            "title": f"TEST_GetById_{uuid.uuid4().hex[:8]}",
            "description": "Get by ID test",
            "custom_field_values": {
                "field-branch": "GetById Branch"
            }
        }
        create_response = requests.post(f"{BASE_URL}/workflow-requests", json=request_data, headers=manager_headers)
        assert create_response.status_code == 200
        created = create_response.json()
        created_workflow_requests.append(created["id"])
        
        # Get by ID
        response = requests.get(f"{BASE_URL}/workflow-requests/{created['id']}", headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == created["id"]
        assert data["title"] == request_data["title"]
        # Should include workflow_steps from request type
        assert "workflow_steps" in data
        print(f"Successfully retrieved workflow request: {data['id']}")
    
    def test_cancel_workflow_request(self, manager_headers, test_request_type):
        """Test cancelling a workflow request"""
        # First create a request
        request_data = {
            "request_type_id": test_request_type["id"],
            "title": f"TEST_Cancel_{uuid.uuid4().hex[:8]}",
            "description": "To be cancelled",
            "custom_field_values": {
                "field-branch": "Cancel Branch"
            }
        }
        create_response = requests.post(f"{BASE_URL}/workflow-requests", json=request_data, headers=manager_headers)
        assert create_response.status_code == 200
        created = create_response.json()
        created_workflow_requests.append(created["id"])
        
        # Cancel it
        response = requests.patch(f"{BASE_URL}/workflow-requests/{created['id']}/cancel", headers=manager_headers)
        assert response.status_code == 200
        
        # Verify it's cancelled
        get_response = requests.get(f"{BASE_URL}/workflow-requests/{created['id']}", headers=manager_headers)
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["status"] == "cancelled"
        print(f"Successfully cancelled workflow request: {created['id']}")
    
    def test_delete_workflow_request(self, manager_headers, test_request_type):
        """Test deleting a workflow request (Admin only)"""
        # First create a request
        request_data = {
            "request_type_id": test_request_type["id"],
            "title": f"TEST_Delete_{uuid.uuid4().hex[:8]}",
            "description": "To be deleted",
            "custom_field_values": {
                "field-branch": "Delete Branch"
            }
        }
        create_response = requests.post(f"{BASE_URL}/workflow-requests", json=request_data, headers=manager_headers)
        assert create_response.status_code == 200
        created = create_response.json()
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/workflow-requests/{created['id']}", headers=manager_headers)
        assert response.status_code == 200
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/workflow-requests/{created['id']}", headers=manager_headers)
        assert get_response.status_code == 404
        print(f"Successfully deleted workflow request: {created['id']}")


# ==================== FILE UPLOAD TESTS ====================

class TestWorkflowFileUpload:
    """Test file upload functionality for workflow steps"""
    
    @pytest.fixture(scope="class")
    def workflow_request_for_upload(self, manager_headers, users_list):
        """Create a request type and workflow request for file upload testing"""
        assignee_id = users_list[0]["id"] if users_list else None
        assignee_name = users_list[0].get("name") or users_list[0]["username"] if users_list else None
        
        # Create request type with single step
        request_type_data = {
            "name": f"TEST_FileUpload_Type_{uuid.uuid4().hex[:8]}",
            "description": "Request type for file upload testing",
            "is_active": True,
            "custom_fields": [],
            "workflow_steps": [
                {
                    "id": "upload-step-1",
                    "step_number": 1,
                    "name": "Upload Document",
                    "description": "Upload required document",
                    "assigned_to": assignee_id,
                    "assigned_to_name": assignee_name,
                    "requires_file": True,
                    "allowed_file_types": ["pdf", "xlsx", "xls"]
                }
            ]
        }
        
        type_response = requests.post(f"{BASE_URL}/request-types", json=request_type_data, headers=manager_headers)
        assert type_response.status_code == 200
        request_type = type_response.json()
        created_request_types.append(request_type["id"])
        
        # Create workflow request
        request_data = {
            "request_type_id": request_type["id"],
            "title": f"TEST_FileUpload_Request_{uuid.uuid4().hex[:8]}",
            "description": "Request for file upload testing",
            "custom_field_values": {}
        }
        
        req_response = requests.post(f"{BASE_URL}/workflow-requests", json=request_data, headers=manager_headers)
        assert req_response.status_code == 200
        workflow_request = req_response.json()
        created_workflow_requests.append(workflow_request["id"])
        
        return {
            "request_type": request_type,
            "workflow_request": workflow_request
        }
    
    def test_upload_step_file(self, manager_headers, workflow_request_for_upload):
        """Test uploading a file to complete a workflow step"""
        workflow_request = workflow_request_for_upload["workflow_request"]
        request_type = workflow_request_for_upload["request_type"]
        
        # Create a simple PDF-like file content (minimal valid PDF)
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF"
        
        # Prepare multipart form data
        files = {
            'file': ('test_document.pdf', pdf_content, 'application/pdf')
        }
        data = {
            'step_id': request_type["workflow_steps"][0]["id"],
            'notes': 'Test upload notes'
        }
        
        # Use headers without Content-Type (let requests set it for multipart)
        upload_headers = {
            "Authorization": manager_headers["Authorization"]
        }
        
        response = requests.post(
            f"{BASE_URL}/workflow-requests/{workflow_request['id']}/upload-step-file",
            files=files,
            data=data,
            headers=upload_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] == True
        # Since there's only 1 step, it should be completed
        assert result["is_completed"] == True
        print(f"Successfully uploaded file and completed workflow")
    
    def test_upload_wrong_file_type(self, manager_headers, users_list):
        """Test uploading wrong file type is rejected"""
        assignee_id = users_list[0]["id"] if users_list else None
        assignee_name = users_list[0].get("name") or users_list[0]["username"] if users_list else None
        
        # Create request type that only allows PDF
        request_type_data = {
            "name": f"TEST_WrongFileType_{uuid.uuid4().hex[:8]}",
            "description": "Only PDF allowed",
            "is_active": True,
            "custom_fields": [],
            "workflow_steps": [
                {
                    "id": "pdf-only-step",
                    "step_number": 1,
                    "name": "PDF Only Step",
                    "description": "Only PDF files allowed",
                    "assigned_to": assignee_id,
                    "assigned_to_name": assignee_name,
                    "requires_file": True,
                    "allowed_file_types": ["pdf"]
                }
            ]
        }
        
        type_response = requests.post(f"{BASE_URL}/request-types", json=request_type_data, headers=manager_headers)
        assert type_response.status_code == 200
        request_type = type_response.json()
        created_request_types.append(request_type["id"])
        
        # Create workflow request
        request_data = {
            "request_type_id": request_type["id"],
            "title": f"TEST_WrongFile_{uuid.uuid4().hex[:8]}",
            "description": "Test wrong file type",
            "custom_field_values": {}
        }
        
        req_response = requests.post(f"{BASE_URL}/workflow-requests", json=request_data, headers=manager_headers)
        assert req_response.status_code == 200
        workflow_request = req_response.json()
        created_workflow_requests.append(workflow_request["id"])
        
        # Try to upload a .txt file (not allowed)
        files = {
            'file': ('test.txt', b'This is a text file', 'text/plain')
        }
        data = {
            'step_id': request_type["workflow_steps"][0]["id"],
            'notes': 'Wrong file type test'
        }
        
        upload_headers = {
            "Authorization": manager_headers["Authorization"]
        }
        
        response = requests.post(
            f"{BASE_URL}/workflow-requests/{workflow_request['id']}/upload-step-file",
            files=files,
            data=data,
            headers=upload_headers
        )
        
        assert response.status_code == 400
        print("Correctly rejected wrong file type")


# ==================== WORKFLOW STATS TESTS ====================

class TestWorkflowStats:
    """Test workflow statistics endpoint"""
    
    def test_get_workflow_stats(self, manager_headers):
        """Test getting workflow statistics"""
        response = requests.get(f"{BASE_URL}/workflow-stats", headers=manager_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        assert "pending" in data
        assert "in_progress" in data
        assert "completed" in data
        assert "cancelled" in data
        assert "assigned_to_me" in data
        
        print(f"Workflow stats: total={data['total']}, pending={data['pending']}, in_progress={data['in_progress']}, completed={data['completed']}")


# ==================== CLEANUP ====================

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_workflow_requests(self, manager_headers):
        """Delete test workflow requests"""
        deleted = 0
        for request_id in created_workflow_requests:
            try:
                response = requests.delete(f"{BASE_URL}/workflow-requests/{request_id}", headers=manager_headers)
                if response.status_code == 200:
                    deleted += 1
            except:
                pass
        print(f"Cleaned up {deleted} workflow requests")
    
    def test_cleanup_request_types(self, manager_headers):
        """Delete test request types"""
        deleted = 0
        for type_id in created_request_types:
            try:
                response = requests.delete(f"{BASE_URL}/request-types/{type_id}", headers=manager_headers)
                if response.status_code == 200:
                    deleted += 1
            except:
                pass
        print(f"Cleaned up {deleted} request types")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
