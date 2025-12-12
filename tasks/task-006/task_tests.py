import pytest
import requests
import subprocess
import time
import signal
import os
import sys
from datetime import datetime, timedelta

# Get the correct path to the repo root
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
BASE_URL = "http://localhost:5001"

class TestDateTimeOperations:
    
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

    def test_datetime_current(self):
        """Test get current date and time"""
        response = requests.post(f"{BASE_URL}/api/datetime/current")
        
        assert response.status_code == 200
        data = response.json()
        assert "current" in data
        
        # Verify it's a valid ISO date string
        current_date = data["current"]
        try:
            datetime.fromisoformat(current_date.replace('Z', '+00:00'))
        except ValueError:
            pytest.fail("Current date is not in valid ISO format")

    def test_datetime_add_days_basic(self):
        """Test add days to a date"""
        payload = {"date": "2024-01-01", "days": 5}
        response = requests.post(f"{BASE_URL}/api/datetime/add-days", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"] == "2024-01-06"

    def test_datetime_diff_days_basic(self):
        """Test calculate difference between two dates"""
        payload = {"start": "2024-01-01", "end": "2024-01-05"}
        response = requests.post(f"{BASE_URL}/api/datetime/diff-days", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"] == 4

    def test_datetime_format_date(self):
        """Test format date to readable string"""
        payload = {"date": "2024-01-01"}
        response = requests.post(f"{BASE_URL}/api/datetime/format", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"] == "January 1, 2024"

    def test_datetime_is_weekend_saturday(self):
        """Test check if date is weekend (Saturday)"""
        payload = {"date": "2024-01-06"}  # Saturday
        response = requests.post(f"{BASE_URL}/api/datetime/is-weekend", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"] == True

    def test_datetime_due_soon_true(self):
        """Test check if date is due soon (within 3 days)"""
        # Calculate date 2 days from today
        future_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        payload = {"date": future_date}
        response = requests.post(f"{BASE_URL}/api/datetime/due-soon", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"] == True
