from fastapi.testclient import TestClient
from backend.app.main import app
import sys

client = TestClient(app)

def run_tests():
    # Registration
    r = client.post("/api/auth/register", json={"email": "tester@example.com", "password": "SecurePassword123!"})
    if r.status_code != 201 and r.status_code != 409:
        print(f"Failed register: {r.text}")
        sys.exit(1)
    print("Register endpoint responded correctly")

if __name__ == "__main__":
    run_tests()
