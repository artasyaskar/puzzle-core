import pytest
import requests
import subprocess
import time
import signal
import os
import sys

# Get the correct path to the repo root
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
BASE_URL = "http://localhost:5001"

class TestProjectsAdvancedManagement:
    
    @classmethod
    def setup_class(cls):
        """Start the test server"""
        # Start the server in background
        cls.server_process = subprocess.Popen(
            ["node", "server/index-test.js"],
            cwd=REPO_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for server to be ready
        max_retries = 30
        for i in range(max_retries):
            try:
                response = requests.get(f"{BASE_URL}/health", timeout=2)
                if response.status_code == 200:
                    break
            except requests.exceptions.RequestException:
                pass
            time.sleep(0.2)
        else:
            cls.teardown_class()
            pytest.fail("Server failed to start within timeout")

    @classmethod
    def teardown_class(cls):
        """Stop the test server"""
        if hasattr(cls, 'server_process'):
            cls.server_process.terminate()
            cls.server_process.wait()

    def get_auth_headers(self):
        """Get authorization headers for authenticated requests"""
        # For testing, we'll use a mock token
        return {"Authorization": "Bearer mock-token-for-testing"}

    def test_get_single_project(self):
        """Test get single project details"""
        # First create a project
        create_payload = {
            "name": "Test Project",
            "description": "A test project for detailed view"
        }
        headers = self.get_auth_headers()
        create_response = requests.post(f"{BASE_URL}/api/projects", json=create_payload, headers=headers)
        assert create_response.status_code == 201
        project_id = create_response.json()["project"]["id"]
        
        # Get the project details
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "project" in data
        assert data["project"]["id"] == project_id
        assert data["project"]["name"] == "Test Project"

    def test_update_project_details(self):
        """Test update project details"""
        # First create a project
        create_payload = {
            "name": "Original Project",
            "description": "Original description"
        }
        headers = self.get_auth_headers()
        create_response = requests.post(f"{BASE_URL}/api/projects", json=create_payload, headers=headers)
        assert create_response.status_code == 201
        project_id = create_response.json()["project"]["id"]
        
        # Update the project
        update_payload = {"name": "Updated Project"}
        response = requests.put(f"{BASE_URL}/api/projects/{project_id}", json=update_payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "project" in data
        assert data["project"]["name"] == "Updated Project"

    def test_delete_project(self):
        """Test delete project"""
        # First create a project
        create_payload = {
            "name": "Project to Delete",
            "description": "This project will be deleted"
        }
        headers = self.get_auth_headers()
        create_response = requests.post(f"{BASE_URL}/api/projects", json=create_payload, headers=headers)
        assert create_response.status_code == 201
        project_id = create_response.json()["project"]["id"]
        
        # Delete the project
        response = requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "deleted successfully" in data["message"].lower()

    def test_add_team_member(self):
        """Test add team member to project"""
        # First create a project
        create_payload = {
            "name": "Team Project",
            "description": "Project with team members"
        }
        headers = self.get_auth_headers()
        create_response = requests.post(f"{BASE_URL}/api/projects", json=create_payload, headers=headers)
        assert create_response.status_code == 201
        project_id = create_response.json()["project"]["id"]
        
        # Add a team member
        member_payload = {
            "userId": "user456",
            "role": "developer"
        }
        response = requests.post(f"{BASE_URL}/api/projects/{project_id}/members", json=member_payload, headers=headers)
        
        assert response.status_code == 201
        data = response.json()
        assert "project" in data
        assert "members" in data["project"]
        assert len(data["project"]["members"]) > 0
        assert data["project"]["members"][0]["userId"] == "user456"
        assert data["project"]["members"][0]["role"] == "developer"

    def test_remove_team_member(self):
        """Test remove team member from project"""
        # First create a project and add a member
        create_payload = {
            "name": "Project with Member",
            "description": "Project to remove member from"
        }
        headers = self.get_auth_headers()
        create_response = requests.post(f"{BASE_URL}/api/projects", json=create_payload, headers=headers)
        assert create_response.status_code == 201
        project_id = create_response.json()["project"]["id"]
        
        # Add a member first
        member_payload = {
            "userId": "user789",
            "role": "designer"
        }
        add_response = requests.post(f"{BASE_URL}/api/projects/{project_id}/members", json=member_payload, headers=headers)
        assert add_response.status_code == 201
        
        # Remove the member
        response = requests.delete(f"{BASE_URL}/api/projects/{project_id}/members/user789", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "project" in data
        assert "members" in data["project"]
        # Member should be removed
        member_ids = [m["userId"] for m in data["project"]["members"]]
        assert "user789" not in member_ids

    def test_update_project_status(self):
        """Test update project status"""
        # First create a project
        create_payload = {
            "name": "Status Project",
            "description": "Project to update status"
        }
        headers = self.get_auth_headers()
        create_response = requests.post(f"{BASE_URL}/api/projects", json=create_payload, headers=headers)
        assert create_response.status_code == 201
        project_id = create_response.json()["project"]["id"]
        
        # Update project status
        status_payload = {"status": "completed"}
        response = requests.post(f"{BASE_URL}/api/projects/{project_id}/status", json=status_payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "project" in data
        assert data["project"]["status"] == "completed"
