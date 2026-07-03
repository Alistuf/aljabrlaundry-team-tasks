"""
Test suite for Multi-step Workflow Feature
Tests: Request Types with workflow steps, Dynamic Requests creating workflow requests,
       Workflow Requests tab, WorkflowRequestDetail page
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')

# Test credentials
MANAGER_USERNAME = "manager1"
MANAGER_PASSWORD = "manager123"
SUPERVISOR_USERNAME = "aalkhalf"
SUPERVISOR_PASSWORD = "super123"


class TestWorkflowFeature:
    """Test suite for multi-step workflow feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_request_types = []
        self.created_workflow_requests = []
        yield
        # Cleanup
        self._cleanup()
    
    def _cleanup(self):
        """Clean up test data"""
        if hasattr(self, 'token') and self.token:
            headers = {"Authorization": f"Bearer {self.token}"}
            for rt_id in self.created_request_types:
                try:
                    requests.delete(f"{BASE_URL}/api/request-types/{rt_id}", headers=headers)
                except:
                    pass
            for wr_id in self.created_workflow_requests:
                try:
                    requests.delete(f"{BASE_URL}/api/workflow-requests/{wr_id}", headers=headers)
                except:
                    pass
    
    def _login_manager(self):
        """Login as manager and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": MANAGER_USERNAME,
            "password": MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Manager login failed: {response.text}"
        data = response.json()
        self.token = data["access_token"]
        self.user_id = data["user"]["id"]
        return self.token
    
    def _get_users(self, token):
        """Get list of users for workflow step assignment"""
        response = self.session.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        return response.json()
    
    # ==================== REQUEST TYPES WITH WORKFLOW STEPS ====================
    
    def test_create_request_type_with_workflow_steps(self):
        """Test creating a request type with workflow steps"""
        token = self._login_manager()
        users = self._get_users(token)
        
        # Get two different users for the workflow steps
        user1 = users[0] if users else None
        user2 = users[1] if len(users) > 1 else users[0] if users else None
        
        request_type_data = {
            "name": f"TEST_Workflow_{uuid.uuid4().hex[:8]}",
            "description": "Test workflow request type",
            "is_active": True,
            "custom_fields": [
                {
                    "id": f"field_{uuid.uuid4().hex[:8]}",
                    "name": "Description",
                    "field_type": "text",
                    "required": True,
                    "options": [],
                    "description": "Enter description"
                }
            ],
            "workflow_steps": [
                {
                    "id": f"step_{uuid.uuid4().hex[:8]}",
                    "step_number": 1,
                    "name": "Design Review",
                    "description": "Review the design",
                    "assigned_to": user1["id"] if user1 else None,
                    "requires_file": True,
                    "allowed_file_types": ["pdf", "xlsx", "xls"]
                },
                {
                    "id": f"step_{uuid.uuid4().hex[:8]}",
                    "step_number": 2,
                    "name": "Final Approval",
                    "description": "Final approval step",
                    "assigned_to": user2["id"] if user2 else None,
                    "requires_file": True,
                    "allowed_file_types": ["pdf", "xlsx", "xls"]
                }
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/request-types",
            json=request_type_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Failed to create request type: {response.text}"
        data = response.json()
        
        # Verify response
        assert data["name"] == request_type_data["name"]
        assert len(data["workflow_steps"]) == 2
        assert data["workflow_steps"][0]["name"] == "Design Review"
        assert data["workflow_steps"][1]["name"] == "Final Approval"
        
        self.created_request_types.append(data["id"])
        print(f"SUCCESS: Created request type with 2 workflow steps: {data['id']}")
        return data
    
    def test_public_request_types_includes_has_workflow_flag(self):
        """Test that public request types endpoint includes has_workflow flag"""
        response = self.session.get(f"{BASE_URL}/api/public/request-types")
        
        assert response.status_code == 200, f"Failed to get public request types: {response.text}"
        data = response.json()
        
        # Check that each request type has the has_workflow flag
        for rt in data:
            assert "has_workflow" in rt, f"Request type {rt['name']} missing has_workflow flag"
            assert "workflow_steps_count" in rt, f"Request type {rt['name']} missing workflow_steps_count"
            print(f"Request type '{rt['name']}': has_workflow={rt['has_workflow']}, steps={rt['workflow_steps_count']}")
        
        print(f"SUCCESS: Public request types endpoint returns {len(data)} types with has_workflow flag")
    
    # ==================== DYNAMIC REQUESTS CREATING WORKFLOW REQUESTS ====================
    
    def test_dynamic_request_creates_workflow_request_when_steps_exist(self):
        """Test that submitting a dynamic request creates a workflow_request when steps exist"""
        token = self._login_manager()
        
        # First create a request type with workflow steps
        request_type = self.test_create_request_type_with_workflow_steps()
        
        # Get the custom field ID
        field_id = request_type["custom_fields"][0]["id"]
        
        # Submit a dynamic request (public endpoint)
        dynamic_request_data = {
            "request_type_id": request_type["id"],
            "field_values": {
                field_id: "Test description for workflow"
            }
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/dynamic-requests",
            json=dynamic_request_data
        )
        
        assert response.status_code == 200, f"Failed to create dynamic request: {response.text}"
        data = response.json()
        
        # Verify it created a workflow request
        assert data["success"] == True
        assert data["has_workflow"] == True
        assert "request_id" in data
        
        self.created_workflow_requests.append(data["request_id"])
        print(f"SUCCESS: Dynamic request created workflow request: {data['request_id']}")
        return data["request_id"]
    
    # ==================== WORKFLOW REQUESTS API ====================
    
    def test_get_workflow_requests(self):
        """Test getting workflow requests list"""
        token = self._login_manager()
        
        response = self.session.get(
            f"{BASE_URL}/api/workflow-requests",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Failed to get workflow requests: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        print(f"SUCCESS: Got {len(data)} workflow requests")
        
        # Check structure of workflow requests
        if data:
            wr = data[0]
            required_fields = ["id", "request_type_id", "request_type_name", "title", 
                             "current_step", "total_steps", "status", "created_at"]
            for field in required_fields:
                assert field in wr, f"Workflow request missing field: {field}"
            print(f"SUCCESS: Workflow request structure is correct")
    
    def test_get_workflow_request_detail(self):
        """Test getting a specific workflow request with full details"""
        token = self._login_manager()
        
        # Create a workflow request first
        workflow_request_id = self.test_dynamic_request_creates_workflow_request_when_steps_exist()
        
        response = self.session.get(
            f"{BASE_URL}/api/workflow-requests/{workflow_request_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Failed to get workflow request detail: {response.text}"
        data = response.json()
        
        # Verify detail includes workflow_steps
        assert "workflow_steps" in data, "Workflow request detail missing workflow_steps"
        assert len(data["workflow_steps"]) == 2, f"Expected 2 workflow steps, got {len(data['workflow_steps'])}"
        assert data["current_step"] == 1, f"Expected current_step=1, got {data['current_step']}"
        assert data["status"] == "pending", f"Expected status=pending, got {data['status']}"
        
        print(f"SUCCESS: Workflow request detail includes {len(data['workflow_steps'])} steps")
    
    # ==================== WORKFLOW STATS ====================
    
    def test_get_workflow_stats(self):
        """Test getting workflow statistics"""
        token = self._login_manager()
        
        response = self.session.get(
            f"{BASE_URL}/api/workflow-stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Failed to get workflow stats: {response.text}"
        data = response.json()
        
        # Verify stats structure
        required_fields = ["total", "pending", "in_progress", "completed", "cancelled"]
        for field in required_fields:
            assert field in data, f"Workflow stats missing field: {field}"
            assert isinstance(data[field], int), f"Field {field} should be integer"
        
        print(f"SUCCESS: Workflow stats - Total: {data['total']}, Pending: {data['pending']}, "
              f"In Progress: {data['in_progress']}, Completed: {data['completed']}, Cancelled: {data['cancelled']}")
    
    # ==================== WORKFLOW STEP COMPLETION ====================
    
    def test_complete_workflow_step(self):
        """Test completing a workflow step"""
        token = self._login_manager()
        
        # Create a workflow request
        workflow_request_id = self.test_dynamic_request_creates_workflow_request_when_steps_exist()
        
        # Get the workflow request detail to find the current step
        response = self.session.get(
            f"{BASE_URL}/api/workflow-requests/{workflow_request_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        wr_data = response.json()
        
        current_step = wr_data["workflow_steps"][0]
        step_id = current_step["id"]
        
        # Create a test PDF file (minimal valid PDF)
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF"
        
        # Complete the step with file upload
        files = {
            'file': ('test.pdf', pdf_content, 'application/pdf')
        }
        data = {
            'step_id': step_id,
            'notes': 'Test completion notes'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/workflow-requests/{workflow_request_id}/upload-step-file",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Failed to complete step: {response.text}"
        result = response.json()
        
        assert result["success"] == True
        assert result["is_completed"] == False  # Should not be completed yet (2 steps)
        
        print(f"SUCCESS: Completed step 1, request moved to step 2")
        
        # Verify the request moved to step 2
        response = self.session.get(
            f"{BASE_URL}/api/workflow-requests/{workflow_request_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        updated_wr = response.json()
        
        assert updated_wr["current_step"] == 2, f"Expected current_step=2, got {updated_wr['current_step']}"
        assert updated_wr["status"] == "in_progress", f"Expected status=in_progress, got {updated_wr['status']}"
        
        print(f"SUCCESS: Workflow request status updated to in_progress, current_step=2")


class TestWorkflowRequestTypeValidation:
    """Test validation for request types with workflow steps"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_request_types = []
        yield
        self._cleanup()
    
    def _cleanup(self):
        if hasattr(self, 'token') and self.token:
            headers = {"Authorization": f"Bearer {self.token}"}
            for rt_id in self.created_request_types:
                try:
                    requests.delete(f"{BASE_URL}/api/request-types/{rt_id}", headers=headers)
                except:
                    pass
    
    def _login_manager(self):
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": MANAGER_USERNAME,
            "password": MANAGER_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        return self.token
    
    def test_request_type_without_workflow_steps(self):
        """Test creating a request type without workflow steps (simple assignment)"""
        token = self._login_manager()
        
        request_type_data = {
            "name": f"TEST_Simple_{uuid.uuid4().hex[:8]}",
            "description": "Simple request type without workflow",
            "is_active": True,
            "custom_fields": [
                {
                    "id": f"field_{uuid.uuid4().hex[:8]}",
                    "name": "Notes",
                    "field_type": "text",
                    "required": False
                }
            ],
            "workflow_steps": []  # No workflow steps
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/request-types",
            json=request_type_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["workflow_steps"]) == 0
        self.created_request_types.append(data["id"])
        
        # Verify public endpoint shows has_workflow=False
        response = self.session.get(f"{BASE_URL}/api/public/request-types")
        assert response.status_code == 200
        public_types = response.json()
        
        created_type = next((t for t in public_types if t["id"] == data["id"]), None)
        assert created_type is not None
        assert created_type["has_workflow"] == False
        assert created_type["workflow_steps_count"] == 0
        
        print(f"SUCCESS: Request type without workflow steps created, has_workflow=False")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
