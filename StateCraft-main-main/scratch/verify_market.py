import urllib.request
import urllib.parse
import json
import time

BASE_URL = "http://localhost:8000"

def request_json(url, method="GET", data=None):
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    body = json.dumps(data).encode("utf-8") if data else None
    try:
        with urllib.request.urlopen(req, data=body) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def main():
    print("=== STARTING MARKET VERIFICATION ===")

    # 1. Test GET /api/market/config
    status, res = request_json(f"{BASE_URL}/api/market/config")
    assert status == 200, f"Expected 200, got {status}"
    items = res.get("items", [])
    categories = res.get("categories", [])
    print(f"[PASS] GET /api/market/config returned {len(items)} items and {len(categories)} categories")
    assert len(items) == 20, f"Expected 20 items, got {len(items)}"
    assert len(categories) == 11, f"Expected 11 categories, got {len(categories)}"

    # 2. Fetch full data to find a test team
    status, db_data = request_json(f"{BASE_URL}/api/data")
    assert status == 200, f"Expected 200 from /api/data, got {status}"
    teams = db_data.get("teams", [])
    assert len(teams) > 0, "No teams in database!"
    test_team = teams[0]
    print(f"Testing with Team: {test_team['name']} (ID: {test_team['id']}, Points: {test_team.get('points', 0)})")

    # Give test team 500 points first if they don't have enough
    award_status, award_res = request_json(
        f"{BASE_URL}/api/teams/{test_team['id']}/points",
        method="POST",
        data={"pointsChange": 500, "category": "Test Initialization", "reason": "Testing Market"}
    )
    assert award_status == 200, f"Failed to award test points: {award_res}"
    current_team = award_res["team"]
    starting_points = current_team["points"]
    starting_dev = current_team.get("developmentScore", 0)
    print(f"Team balance set to {starting_points} pts (Dev Score: {starting_dev})")

    # Clean team's existing market purchases first
    request_json(f"{BASE_URL}/api/market/reset", method="POST", data={"teamId": test_team["id"], "refundPoints": False})

    # Re-fetch team
    status, db_data = request_json(f"{BASE_URL}/api/data")
    current_team = next(t for t in db_data["teams"] if t["id"] == test_team["id"])
    starting_points = current_team["points"]

    # 3. Test Invalid Password
    status, res = request_json(
        f"{BASE_URL}/api/market/buy",
        method="POST",
        data={"teamId": test_team["id"], "password": "wrong_password_xyz", "itemId": "phc"}
    )
    assert status == 401, f"Expected 401 for wrong password, got {status}: {res}"
    print("[PASS] Security validation blocked purchase with invalid password (401)")

    # 4. Test Insufficient Points
    # Temporarily set points to 10
    request_json(
        f"{BASE_URL}/api/teams/{test_team['id']}/points",
        method="POST",
        data={"pointsChange": -starting_points + 10, "category": "Test", "reason": "Lower points"}
    )
    status, res = request_json(
        f"{BASE_URL}/api/market/buy",
        method="POST",
        data={"teamId": test_team["id"], "password": test_team.get("password", ""), "itemId": "smart_city"}
    )
    assert status == 400, f"Expected 400 for insufficient points, got {status}: {res}"
    assert "Insufficient points to purchase this infrastructure." in res.get("error", ""), f"Unexpected error message: {res}"
    print("[PASS] Insufficient points validation returned 400 with exact required error message")

    # Restore 500 points
    request_json(
        f"{BASE_URL}/api/teams/{test_team['id']}/points",
        method="POST",
        data={"pointsChange": 500, "category": "Test", "reason": "Restore points"}
    )

    # Re-fetch team
    status, db_data = request_json(f"{BASE_URL}/api/data")
    current_team = next(t for t in db_data["teams"] if t["id"] == test_team["id"])
    cur_pts = current_team["points"]
    cur_dev = current_team["developmentScore"]

    # 5. Test Successful Purchase: District Hospital (Healthcare, Cost: 180, Bonus: 180)
    target_item = next(i for i in items if i["id"] == "district_hospital")
    status, res = request_json(
        f"{BASE_URL}/api/market/buy",
        method="POST",
        data={"teamId": test_team["id"], "password": test_team.get("password", ""), "itemId": "district_hospital"}
    )
    assert status == 200, f"Expected 200 from successful buy, got {status}: {res}"
    assert res.get("success") is True
    updated_team = res["team"]
    assert updated_team["points"] == cur_pts - target_item["cost"], f"Points mismatch: {updated_team['points']} vs {cur_pts - target_item['cost']}"
    assert updated_team["developmentScore"] == cur_dev + target_item["bonus"], f"Dev score mismatch: {updated_team['developmentScore']}"
    assert updated_team["categoryScores"]["Healthcare"] == target_item["bonus"]
    assert any(p["id"] == "district_hospital" for p in updated_team["purchasedInfrastructure"])
    print(f"[PASS] Successful purchase: 180 pts deducted ({cur_pts} -> {updated_team['points']}), +180 Healthcare Dev Points added!")

    # 6. Test Duplicate Purchase Prevention
    status, res = request_json(
        f"{BASE_URL}/api/market/buy",
        method="POST",
        data={"teamId": test_team["id"], "password": test_team.get("password", ""), "itemId": "district_hospital"}
    )
    assert status == 400, f"Expected 400 for duplicate purchase, got {status}: {res}"
    assert "already been purchased" in res.get("error", "")
    print(f"[PASS] Duplicate purchase blocked: {res['error']}")

    # 7. Test Market Reset with Refund
    pre_reset_pts = updated_team["points"]
    status, res = request_json(
        f"{BASE_URL}/api/market/reset",
        method="POST",
        data={"teamId": test_team["id"], "refundPoints": True}
    )
    assert status == 200, f"Expected 200 from reset, got {status}: {res}"
    reset_team = res["team"]
    assert reset_team["developmentScore"] == 0
    assert len(reset_team["purchasedInfrastructure"]) == 0
    assert reset_team["points"] == pre_reset_pts + target_item["cost"], f"Refund mismatch: {reset_team['points']} vs {pre_reset_pts + target_item['cost']}"
    print(f"[PASS] Market reset with refund: +{target_item['cost']} pts refunded, devScore reset to 0")

    # 8. Test Market Config Update (Admin)
    original_cost = items[0]["cost"]
    items[0]["cost"] = 99
    status, res = request_json(
        f"{BASE_URL}/api/market/config",
        method="POST",
        data={"items": items}
    )
    assert status == 200, f"Failed to save market config: {res}"

    # Verify saved
    status, res = request_json(f"{BASE_URL}/api/market/config")
    assert res["items"][0]["cost"] == 99, f"Config update did not persist: {res['items'][0]['cost']}"

    # Restore original cost
    items[0]["cost"] = original_cost
    request_json(f"{BASE_URL}/api/market/config", method="POST", data={"items": items})
    print(f"[PASS] Market config update persisted to data/market_config.json and restored")

    print("\nALL BACKEND API TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    main()
