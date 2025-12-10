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

class TestProjectEnhancements:
    
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

    def create_test_projects(self):
        """Helper method to create test projects"""
        import random
        unique_id = random.randint(1000, 9999)
        
        # First get auth token
        auth_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"projecttestuser{unique_id}",
            "email": f"projecttest{unique_id}@example.com",
            "password": "password123",
            "firstName": "Project",
            "lastName": "Test"
        })
        
        token = auth_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        projects = [
            {
                "name": "Active Project",
                "description": "This is an active project",
                "status": "active",
                "priority": "high"
            },
            {
                "name": "Completed Project", 
                "description": "This project is completed",
                "status": "completed",
                "priority": "low"
            },
            {
                "name": "Test Project",
                "description": "A project for testing",
                "status": "active", 
                "priority": "medium"
            }
        ]
        
        created_projects = []
        for project in projects:
            response = requests.post(f"{BASE_URL}/api/projects", json=project, headers=headers)
            if response.status_code == 201:
                created_projects.append(response.json())
        
        return headers

    def test_projects_filter_by_status(self):
        """Test filter projects by status"""
        headers = self.create_test_projects()
        
        response = requests.get(f"{BASE_URL}/api/projects/filter?status=active", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data
        assert len(data["projects"]) >= 2  # At least 2 active projects
        
        # All returned projects should have status "active"
        for project in data["projects"]:
            assert project["status"] == "active"

    def test_projects_filter_by_priority(self):
        """Test filter projects by priority"""
        headers = self.create_test_projects()
        
        response = requests.get(f"{BASE_URL}/api/projects/filter?priority=high", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data
        
        # All returned projects should have priority "high"
        for project in data["projects"]:
            assert project["priority"] == "high"

    def test_projects_sort_by_name_ascending(self):
        """Test sort projects by name ascending"""
        headers = self.create_test_projects()
        
        response = requests.get(f"{BASE_URL}/api/projects/sort?field=name&order=asc", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data
        
        # Check if projects are sorted by name ascending
        project_names = [p["name"] for p in data["projects"]]
        assert project_names == sorted(project_names)

    def test_projects_sort_by_date_descending(self):
        """Test sort projects by date descending"""
        headers = self.create_test_projects()
        
        response = requests.get(f"{BASE_URL}/api/projects/sort?field=date&order=desc", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data
        
        # Check if projects are sorted by date descending (newest first)
        project_dates = [p["createdAt"] for p in data["projects"]]
        assert project_dates == sorted(project_dates, reverse=True)

    def test_projects_search_by_name(self):
        """Test search projects by name"""
        headers = self.create_test_projects()
        
        response = requests.get(f"{BASE_URL}/api/projects/search?q=Test", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data
        
        # All returned projects should have "Test" in name or description
        for project in data["projects"]:
            assert "test" in project["name"].lower() or "test" in project["description"].lower()

    def test_projects_search_empty_query(self):
        """Test search projects with empty query returns all projects"""
        headers = self.create_test_projects()
        
        response = requests.get(f"{BASE_URL}/api/projects/search?q=", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data
        assert len(data["projects"]) >= 3  # Should return all created projects
