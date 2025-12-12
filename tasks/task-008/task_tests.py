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

class TestAuthUserManagement:
    
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

    def get_auth_headers(self, user_id=None):
        """Get authorization headers for authenticated requests"""
        # For testing, we'll use a mock token
        return {"Authorization": "Bearer mock-token-for-testing"}

    def get_admin_headers(self):
        """Get admin authorization headers"""
        # For testing, we'll use a mock admin token
        return {"Authorization": "Bearer admin-token-for-testing"}

    def test_get_all_users_admin(self):
        """Test get all users endpoint (admin only)"""
        payload = {"admin": True}
        headers = self.get_admin_headers()
        response = requests.post(f"{BASE_URL}/api/auth/users", json=payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert isinstance(data["users"], list)

    def test_update_user_profile(self):
        """Test update user profile endpoint"""
        # First register a user to get a valid ID
        register_payload = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
            "firstName": "Test",
            "lastName": "User"
        }
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        assert register_response.status_code == 201
        user_id = register_response.json()["user"]["id"]
        
        # Update the user
        update_payload = {"firstName": "Updated"}
        headers = self.get_auth_headers()
        response = requests.put(f"{BASE_URL}/api/auth/users/{user_id}", json=update_payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert data["user"]["firstName"] == "Updated"

    def test_delete_user_account(self):
        """Test delete user account endpoint"""
        # First register a user to get a valid ID
        register_payload = {
            "username": "deleteuser",
            "email": "delete@example.com",
            "password": "password123",
            "firstName": "Delete",
            "lastName": "User"
        }
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        assert register_response.status_code == 201
        user_id = register_response.json()["user"]["id"]
        
        # Delete the user
        headers = self.get_auth_headers()
        response = requests.delete(f"{BASE_URL}/api/auth/users/{user_id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "deleted successfully" in data["message"].lower()

    def test_change_password(self):
        """Test change password endpoint"""
        # First register a user
        register_payload = {
            "username": "changepassuser",
            "email": "changepass@example.com",
            "password": "oldpassword123",
            "firstName": "Change",
            "lastName": "Pass"
        }
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        assert register_response.status_code == 201
        
        # Change password
        change_payload = {
            "currentPassword": "oldpassword123",
            "newPassword": "newpassword456"
        }
        headers = self.get_auth_headers()
        response = requests.post(f"{BASE_URL}/api/auth/change-password", json=change_payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "password changed" in data["message"].lower()

    def test_forgot_password(self):
        """Test forgot password endpoint"""
        # First register a user
        register_payload = {
            "username": "forgotuser",
            "email": "forgot@example.com",
            "password": "password123",
            "firstName": "Forgot",
            "lastName": "User"
        }
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        assert register_response.status_code == 201
        
        # Request password reset
        forgot_payload = {"email": "forgot@example.com"}
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json=forgot_payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "resetToken" in data
        assert len(data["resetToken"]) > 0

    def test_reset_password(self):
        """Test reset password endpoint"""
        # First register a user and request reset
        register_payload = {
            "username": "resetuser",
            "email": "reset@example.com",
            "password": "password123",
            "firstName": "Reset",
            "lastName": "User"
        }
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        assert register_response.status_code == 201
        
        # Request password reset to get token
        forgot_payload = {"email": "reset@example.com"}
        forgot_response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json=forgot_payload)
        reset_token = forgot_response.json()["resetToken"]
        
        # Reset password
        reset_payload = {
            "token": reset_token,
            "newPassword": "newresetpassword789"
        }
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json=reset_payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "password reset" in data["message"].lower()
