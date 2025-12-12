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

class TestTasksAdvancedManagement:
    
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

    def test_get_single_task(self):
        """Test get single task details"""
        # First create a task
        create_payload = {
            "title": "Test Task",
            "description": "A test task for detailed view",
            "project": "project123"
        }
        headers = self.get_auth_headers()
        create_response = requests.post(f"{BASE_URL}/api/tasks", json=create_payload, headers=headers)
        assert create_response.status_code == 201
        task_id = create_response.json()["task"]["id"]
        
        # Get the task details
        response = requests.get(f"{BASE_URL}/api/tasks/{task_id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "task" in data
        assert data["task"]["id"] == task_id
        assert data["task"]["title"] == "Test Task"

    def test_update_task_details(self):
        """Test update task details"""
        # First create a task
        create_payload = {
            "title": "Original Task",
            "description": "Original description",
            "project": "project456"
        }
        headers = self.get_auth_headers()
        create_response = requests.post(f"{BASE_URL}/api/tasks", json=create_payload, headers=headers)
        assert create_response.status_code == 201
        task_id = create_response.json()["task"]["id"]
        
        # Update the task
        update_payload = {"title": "Updated Task"}
        response = requests.put(f"{BASE_URL}/api/tasks/{task_id}", json=update_payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "task" in data
        assert data["task"]["title"] == "Updated Task"

    def test_delete_task(self):
        """Test delete task"""
        # First create a task
        create_payload = {
            "title": "Task to Delete",
            "description": "This task will be deleted",
            "project": "project789"
        }
        headers = self.get_auth_headers()
        create_response = requests.post(f"{BASE_URL}/api/tasks", json=create_payload, headers=headers)
        assert create_response.status_code == 201
        task_id = create_response.json()["task"]["id"]
        
        # Delete the task
        response = requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "deleted successfully" in data["message"].lower()

    def test_assign_task(self):
        """Test assign task to user"""
        # First create a task
        create_payload = {
            "title": "Task to Assign",
            "description": "This task will be assigned",
            "project": "project101"
        }
        headers = self.get_auth_headers()
        create_response = requests.post(f"{BASE_URL}/api/tasks", json=create_payload, headers=headers)
        assert create_response.status_code == 201
        task_id = create_response.json()["task"]["id"]
        
        # Assign the task
        assign_payload = {"assigneeId": "user456"}
        response = requests.post(f"{BASE_URL}/api/tasks/{task_id}/assign", json=assign_payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "task" in data
        assert data["task"]["assignee"] == "user456"

    def test_update_task_status(self):
        """Test update task status"""
        # First create a task
        create_payload = {
            "title": "Status Task",
            "description": "Task to update status",
            "project": "project202"
        }
        headers = self.get_auth_headers()
        create_response = requests.post(f"{BASE_URL}/api/tasks", json=create_payload, headers=headers)
        assert create_response.status_code == 201
        task_id = create_response.json()["task"]["id"]
        
        # Update task status
        status_payload = {"status": "completed"}
        response = requests.post(f"{BASE_URL}/api/tasks/{task_id}/status", json=status_payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "task" in data
        assert data["task"]["status"] == "completed"

    def test_add_task_comment(self):
        """Test add comment to task"""
        # First create a task
        create_payload = {
            "title": "Comment Task",
            "description": "Task to add comments",
            "project": "project303"
        }
        headers = self.get_auth_headers()
        create_response = requests.post(f"{BASE_URL}/api/tasks", json=create_payload, headers=headers)
        assert create_response.status_code == 201
        task_id = create_response.json()["task"]["id"]
        
        # Add a comment
        comment_payload = {"text": "Great work on this task!"}
        response = requests.post(f"{BASE_URL}/api/tasks/{task_id}/comments", json=comment_payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "task" in data
        assert "comments" in data["task"]
        assert len(data["task"]["comments"]) > 0
        assert data["task"]["comments"][0]["text"] == "Great work on this task!"
