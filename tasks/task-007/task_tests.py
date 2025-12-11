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

class TestAdvancedAnalyticsEnhanced:
    
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

    def test_fibonacci_sequence_basic(self):
        """Test fibonacci sequence generation"""
        payload = {"n": 5}
        headers = self.get_auth_headers()
        response = requests.post(f"{BASE_URL}/api/advanced/fibonacci", json=payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"] == [0, 1, 1, 2, 3]

    def test_fibonacci_zero(self):
        """Test fibonacci sequence with n=0"""
        payload = {"n": 0}
        headers = self.get_auth_headers()
        response = requests.post(f"{BASE_URL}/api/advanced/fibonacci", json=payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"] == []

    def test_factorial_basic(self):
        """Test factorial calculation"""
        payload = {"number": 5}
        headers = self.get_auth_headers()
        response = requests.post(f"{BASE_URL}/api/advanced/factorial", json=payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"] == 120

    def test_factorial_zero(self):
        """Test factorial with zero"""
        payload = {"number": 0}
        headers = self.get_auth_headers()
        response = requests.post(f"{BASE_URL}/api/advanced/factorial", json=payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"] == 1

    def test_palindrome_true(self):
        """Test palindrome check with true case"""
        payload = {"text": "racecar"}
        headers = self.get_auth_headers()
        response = requests.post(f"{BASE_URL}/api/advanced/palindrome", json=payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"] == True

    def test_palindrome_false(self):
        """Test palindrome check with false case"""
        payload = {"text": "hello"}
        headers = self.get_auth_headers()
        response = requests.post(f"{BASE_URL}/api/advanced/palindrome", json=payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"] == False
