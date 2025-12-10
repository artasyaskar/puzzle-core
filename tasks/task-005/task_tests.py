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

class TestTaskEnhancements:
    
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

    def create_test_user_and_task(self):
        """Helper method to create test user and task"""
        import random
        unique_id = random.randint(1000, 9999)
        
        # Create user
        auth_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"tasktestuser{unique_id}",
            "email": f"tasktest{unique_id}@example.com",
            "password": "password123",
            "firstName": "Task",
            "lastName": "Test"
        })
        
        token = auth_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a project first (required for task)
        project_response = requests.post(f"{BASE_URL}/api/projects", json={
            "name": "Test Project",
            "description": "A project for testing tasks"
        }, headers=headers)
        
        project_id = project_response.json()["project"]["id"]
        
        # Create task
        task_response = requests.post(f"{BASE_URL}/api/tasks", json={
            "title": "Test Task",
            "description": "A task for testing",
            "projectId": project_id
        }, headers=headers)
        
        task_id = task_response.json()["task"]["id"]
        
        return headers, task_id

    def test_task_status_update_valid(self):
        """Test update task status with valid status"""
        headers, task_id = self.create_test_user_and_task()
        
        response = requests.put(f"{BASE_URL}/api/tasks/{task_id}/status", 
                              json={"status": "in-progress"}, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["task"]["status"] == "in-progress"

    def test_task_status_update_invalid(self):
        """Test update task status with invalid status"""
        headers, task_id = self.create_test_user_and_task()
        
        response = requests.put(f"{BASE_URL}/api/tasks/{task_id}/status", 
                              json={"status": "invalid-status"}, headers=headers)
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "Invalid status" in data["error"]

    def test_task_assignment_valid(self):
        """Test assign task to valid user"""
        headers, task_id = self.create_test_user_and_task()
        
        # Create another user to assign to
        import random
        unique_id = random.randint(1000, 9999)
        user_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"assignee{unique_id}",
            "email": f"assignee{unique_id}@example.com",
            "password": "password123",
            "firstName": "Assignee",
            "lastName": "User"
        })
        
        assignee_id = user_response.json()["user"]["id"]
        
        response = requests.put(f"{BASE_URL}/api/tasks/{task_id}/assign", 
                              json={"assignedTo": assignee_id}, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["task"]["assignedTo"] == assignee_id

    def test_task_assignment_invalid_user(self):
        """Test assign task to invalid user"""
        headers, task_id = self.create_test_user_and_task()
        
        response = requests.put(f"{BASE_URL}/api/tasks/{task_id}/assign", 
                              json={"assignedTo": "invalid-user-id"}, headers=headers)
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "Invalid user" in data["error"]

    def test_get_my_tasks_with_assignments(self):
        """Test get tasks assigned to current user"""
        headers, task_id = self.create_test_user_and_task()
        
        # Assign task to current user
        user_response = requests.get(f"{BASE_URL}/api/auth/profile", headers=headers)
        user_id = user_response.json()["user"]["id"]
        
        requests.put(f"{BASE_URL}/api/tasks/{task_id}/assign", 
                    json={"assignedTo": user_id}, headers=headers)
        
        response = requests.get(f"{BASE_URL}/api/tasks/my-tasks", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data
        assert len(data["tasks"]) >= 1
        assert data["tasks"][0]["assignedTo"] == user_id

    def test_get_my_tasks_empty(self):
        """Test get my tasks when no tasks assigned"""
        headers, _ = self.create_test_user_and_task()
        
        response = requests.get(f"{BASE_URL}/api/tasks/my-tasks", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data
        assert len(data["tasks"]) == 0
