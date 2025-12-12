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

class TestStringOperations:
    
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

    def test_string_capitalize_basic(self):
        """Test string capitalize with valid input"""
        payload = {"text": "hello world"}
        response = requests.post(f"{BASE_URL}/api/strings/capitalize", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "capitalized" in data
        assert data["capitalized"] == "Hello World"

    def test_string_capitalize_empty(self):
        """Test string capitalize with empty string"""
        payload = {"text": ""}
        response = requests.post(f"{BASE_URL}/api/strings/capitalize", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "capitalized" in data
        assert data["capitalized"] == ""

    def test_string_slugify_basic(self):
        """Test string slugify with valid input"""
        payload = {"text": "Hello World!"}
        response = requests.post(f"{BASE_URL}/api/strings/slugify", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "slug" in data
        assert data["slug"] == "hello-world"

    def test_string_slugify_project_name(self):
        """Test string slugify with project name"""
        payload = {"text": "My Project Name"}
        response = requests.post(f"{BASE_URL}/api/strings/slugify", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "slug" in data
        assert data["slug"] == "my-project-name"

    def test_string_count_basic(self):
        """Test string count with valid input"""
        payload = {"text": "hello world"}
        response = requests.post(f"{BASE_URL}/api/strings/count", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert data["count"] == 2

    def test_string_count_empty(self):
        """Test string count with empty string"""
        payload = {"text": ""}
        response = requests.post(f"{BASE_URL}/api/strings/count", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert data["count"] == 0
