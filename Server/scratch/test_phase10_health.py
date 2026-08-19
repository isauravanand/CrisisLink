import requests

BASE_URL = "http://localhost:5000/api"

def test_phase10_health_endpoint():
    res = requests.get(f"{BASE_URL}/health")
    print("GET /api/health Status:", res.status_code)
    data = res.json()
    print("Health Payload:", data)

    assert res.status_code == 200
    assert data["success"] == True
    assert data["status"] == "healthy"
    assert "database" in data
    print("HEALTH CHECK PASSED VERIFICATION!")

if __name__ == "__main__":
    test_phase10_health_endpoint()
