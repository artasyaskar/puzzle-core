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

class TestCalculatorOperations:
    
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

    def test_calculator_add_basic(self):
        """Test calculator add with valid input"""
        payload = {"numbers": [100, 200, 50]}
        response = requests.post(f"{BASE_URL}/api/calculator/add", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"] == 350

    def test_calculator_add_empty(self):
        """Test calculator add with empty array"""
        payload = {"numbers": []}
        response = requests.post(f"{BASE_URL}/api/calculator/add", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"] == 0

    def test_calculator_multiply_basic(self):
        """Test calculator multiply with valid input"""
        payload = {"cost": 100, "quantity": 3}
        response = requests.post(f"{BASE_URL}/api/calculator/multiply", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"] == 300

    def test_calculator_multiply_zero(self):
        """Test calculator multiply with zero quantity"""
        payload = {"cost": 50, "quantity": 0}
        response = requests.post(f"{BASE_URL}/api/calculator/multiply", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"] == 0

    def test_calculator_discount_basic(self):
        """Test calculator discount with valid input"""
        payload = {"amount": 1000, "percentage": 10}
        response = requests.post(f"{BASE_URL}/api/calculator/discount", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"] == 900

    def test_calculator_discount_zero(self):
        """Test calculator discount with zero percentage"""
        payload = {"amount": 500, "percentage": 0}
        response = requests.post(f"{BASE_URL}/api/calculator/discount", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"] == 500