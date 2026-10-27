import requests
import json

payload = {
    "batch_name": "Test Batch",
    "plot_id": 1,
    "variety_id": 1,
    "seeding_date": "2026-08-15"
}

try:
    response = requests.post(
        "http://localhost:8000/api/batches",
        json=payload,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Text: {response.text}")
    try:
        print(f"Response JSON: {json.dumps(response.json(), indent=2)}")
    except:
        print("(Response is not JSON)")
except Exception as e:
    print(f"Error: {e}")
