import urllib.request
import urllib.error
import json

BASE_URL = "http://localhost:8000"

def test_api():
    print("1. Testing GET /api/market/config...")
    req = urllib.request.Request(f"{BASE_URL}/api/market/config")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == True
        assert len(data["items"]) == 20, f"Expected 20 items, got {len(data['items'])}"
        assert len(data["categories"]) == 11, f"Expected 11 categories, got {len(data['categories'])}"
        print(f"   [PASS] 20 infrastructure items and 11 categories verified.")

    print("\n2. Testing POST /api/market/buy with insufficient points (Team b, 10 pts, item district_hospital cost 180)...")
    payload = json.dumps({"teamId": "team_05251047", "password": "123", "itemId": "district_hospital"}).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/market/buy", data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            print("   [FAIL] Expected 400 error but got success")
    except urllib.error.HTTPError as e:
        assert e.code == 400, f"Expected 400, got {e.code}"
        err_data = json.loads(e.read().decode())
        assert err_data["error"] == "Insufficient points to purchase this infrastructure.", f"Unexpected error: {err_data['error']}"
        print(f"   [PASS] Received expected 400 error: '{err_data['error']}'")

    print("\n3. Testing POST /api/market/buy with wrong password...")
    payload = json.dumps({"teamId": "team_e901544c", "password": "wrong_pass", "itemId": "phc"}).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/market/buy", data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            print("   [FAIL] Expected 401 error but got success")
    except urllib.error.HTTPError as e:
        assert e.code == 401, f"Expected 401, got {e.code}"
        print(f"   [PASS] Received expected 401 Unauthorized.")

    print("\n4. Testing POST /api/market/buy with valid credentials and sufficient points (Team abc, phc cost 100)...")
    req = urllib.request.Request(f"{BASE_URL}/api/teams/team_e901544c")
    with urllib.request.urlopen(req) as resp:
        team_before = json.loads(resp.read().decode())
        initial_points = team_before["points"]
        initial_dev = team_before.get("developmentScore", 0)
        initial_health = team_before.get("categoryScores", {}).get("Healthcare", 0)

    payload = json.dumps({"teamId": "team_e901544c", "password": "123", "itemId": "phc"}).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/market/buy", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] == True
        updated_team = res["team"]
        assert updated_team["points"] == initial_points - 100, f"Points not deducted: {updated_team['points']}"
        assert updated_team["developmentScore"] == initial_dev + 100, f"Dev score not updated: {updated_team['developmentScore']}"
        assert updated_team["categoryScores"]["Healthcare"] == initial_health + 100, f"Healthcare score not updated"
        assert any(p["id"] == "phc" for p in updated_team["purchasedInfrastructure"]), "Item not in purchasedInfrastructure"
        print(f"   [PASS] Purchase successful! Available points: {initial_points} -> {updated_team['points']}, Dev score: {initial_dev} -> {updated_team['developmentScore']}, Healthcare: {initial_health} -> {updated_team['categoryScores']['Healthcare']}")

    print("\n5. Testing duplicate purchase prevention (Team abc trying to buy phc again)...")
    req = urllib.request.Request(f"{BASE_URL}/api/market/buy", data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            print("   [FAIL] Expected 400 error for duplicate buy but got success")
    except urllib.error.HTTPError as e:
        assert e.code == 400, f"Expected 400, got {e.code}"
        err_data = json.loads(e.read().decode())
        print(f"   [PASS] Duplicate buy rejected with 400: '{err_data['error']}'")

    print("\n6. Testing POST /api/market/reset with refund...")
    payload = json.dumps({"teamId": "team_e901544c", "refundPoints": True}).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/market/reset", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] == True
        team_reset = res["team"]
        assert team_reset["points"] == initial_points, f"Refund failed: points {team_reset['points']} != {initial_points}"
        assert team_reset["developmentScore"] == 0, f"Dev score not reset"
        assert team_reset["categoryScores"]["Healthcare"] == 0, f"Category score not reset"
        assert len(team_reset["purchasedInfrastructure"]) == 0, f"Purchased list not cleared"
        print(f"   [PASS] Reset with refund successful! Points restored to {team_reset['points']}, Dev score reset to 0.")

    print("\n>>> ALL API TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_api()
