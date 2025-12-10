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

class TestAuthEnhancements:
    
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

    def get_auth_token(self):
        """Helper method to get auth token"""
        import random
        unique_id = random.randint(1000, 9999)
        
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"testuser{unique_id}",
            "email": f"test{unique_id}@example.com",
            "password": "password123",
            "firstName": "Test",
            "lastName": "User"
        })
        return register_response.json()["token"]

    def test_auth_refresh_token(self):
        """Test token refresh endpoint"""
        token = self.get_auth_token()
        
        response = requests.post(f"{BASE_URL}/api/auth/refresh", json={
            "token": token
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert len(data["token"]) > 10  # JWT tokens are long strings

    def test_auth_logout(self):
        """Test logout endpoint"""
        token = self.get_auth_token()
        
        response = requests.post(f"{BASE_URL}/api/auth/logout", json={
            "token": token
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Logged out successfully"

    def test_auth_validate_valid_token(self):
        """Test token validation with valid token"""
        token = self.get_auth_token()
        
        response = requests.post(f"{BASE_URL}/api/auth/validate", json={
            "token": token
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "valid" in data
        assert data["valid"] is True

    def test_auth_validate_invalid_token(self):
        """Test token validation with invalid token"""
        response = requests.post(f"{BASE_URL}/api/auth/validate", json={
            "token": "invalid_token_123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "valid" in data
        assert data["valid"] is False

    def test_enhanced_register_validation(self):
        """Test enhanced register endpoint with email validation"""
        # Test invalid email
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": "testuser2",
            "email": "invalid-email",
            "password": "password123",
            "firstName": "Test",
            "lastName": "User"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "email" in data["error"].lower()

    def test_enhanced_login_expiration(self):
        """Test enhanced login endpoint includes expiration"""
        # First register a user
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": "logintestuser",
            "email": "logintest@example.com",
            "password": "password123",
            "firstName": "Login",
            "lastName": "Test"
        })
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "logintest@example.com",
            "password": "password123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "expiresIn" in data
        assert isinstance(data["expiresIn"], str)
