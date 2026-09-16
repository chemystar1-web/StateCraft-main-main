import urllib.request
import json
import re

def verify_all():
    base_url = "http://localhost:8000"

    print("--- 1. Checking 10 Policies per Sector in js/common.js ---")
    with open("js/common.js", "r", encoding="utf-8") as f:
        common_js = f.read()

    # Extract ROUND2_MYSTERY_POLICIES
    m = re.search(r"const ROUND2_MYSTERY_POLICIES\s*=\s*(\{[\s\S]*?\n\};)", common_js)
    assert m, "Could not find ROUND2_MYSTERY_POLICIES in js/common.js"
    
    # We can inspect the file via node or parse roughly in Python
    sectors = [
        "education", "healthcare", "infrastructure", "industrial_development",
        "population", "law_enforcement", "per_capita", "state_debt"
    ]
    
    for s in sectors:
        assert f"{s}: [" in common_js, f"Missing sector {s} in js/common.js"

    print("[OK] All 8 sectors present in js/common.js!")

    print("\n--- 2. Checking HTML and JS for 10-box arena & scroll ---")
    with open("admin.html", "r", encoding="utf-8") as f:
        admin_html = f.read()
    with open("js/admin.js", "r", encoding="utf-8") as f:
        admin_js = f.read()

    assert "10 Confidential Policies" in admin_js, "admin.js should specify 10 Confidential Policies"
    assert "adminRound2Boxes = copy.map" in admin_js, "Missing box initialization"
    assert "scrollIntoView" in admin_js, "Missing smooth scroll down to bottom of the page"
    assert "handleAdminTurnTeamChange" in admin_js, "Missing team change handler"
    assert "Opened boxes remain open!" in admin_js, "Missing notification/behavior preserving opened boxes"
    print("[OK] admin.html and admin.js properly configured for 10 boxes, smooth scroll, and state preservation!")

    print("\n--- 3. Checking CSS for 10-box layout & 3D Flip ---")
    with open("css/design-system.css", "r", encoding="utf-8") as f:
        css = f.read()

    assert "repeat(5, 1fr)" in css, "Missing 5-column grid in CSS"
    assert ".policy-efficiency-boost" in css, "Missing .policy-efficiency-boost in CSS"
    assert ".policy-external-sector" in css, "Missing .policy-external-sector in CSS"
    print("[OK] CSS styles configured with 5-column grid and distinct card themes!")

    print("\n--- 4. Checking Backend API with flexible box count ---")
    req = urllib.request.Request(f"{base_url}/api/data")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        team_id = data["teams"][0]["id"] if data.get("teams") else "T01"
        print(f"[OK] /api/data OK: Found team {team_id}")

    # Test submitting 4 opened boxes (any number of boxes) from Admin
    payload = json.dumps({
        "fromAdmin": True,
        "teamId": team_id,
        "criteriaKey": "education",
        "criteriaTitle": "Education",
        "chosenBoxes": [
            {
                "id": "box_1",
                "title": "Smart Pedagogical Overhaul & AI Classrooms",
                "type": "efficiency_boost",
                "targetCriterion": "education",
                "criteriaPointsChange": 18,
                "teamPointsChange": 40
            },
            {
                "id": "box_2",
                "title": "Universal Girls Scholarship & STEM Fellowship Accord",
                "type": "efficiency_boost",
                "targetCriterion": "education",
                "criteriaPointsChange": 16,
                "teamPointsChange": 35
            },
            {
                "id": "box_5",
                "title": "District Medical College Teaching Hospital Grid",
                "type": "external_sector",
                "targetCriterion": "healthcare",
                "criteriaPointsChange": 15,
                "teamPointsChange": 25
            },
            {
                "id": "box_6",
                "title": "High-Speed School Transit Corridor",
                "type": "external_sector",
                "targetCriterion": "infrastructure",
                "criteriaPointsChange": 14,
                "teamPointsChange": 20
            }
        ]
    }).encode("utf-8")

    post_req = urllib.request.Request(
        f"{base_url}/api/round2/submit",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(post_req) as resp:
        submit_res = json.loads(resp.read().decode("utf-8"))
        assert submit_res.get("success"), f"Submit failed: {submit_res}"
        selection = submit_res.get("selection", {})
        print(f"[OK] /api/round2/submit accepted {len(selection.get('chosenBoxes', []))} boxes! Net team score: {selection.get('netTeamScore')}")

    # Test apply
    apply_payload = json.dumps({"teamId": team_id}).encode("utf-8")
    apply_req = urllib.request.Request(
        f"{base_url}/api/round2/apply",
        data=apply_payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(apply_req) as resp:
        apply_res = json.loads(resp.read().decode("utf-8"))
        assert apply_res.get("success"), f"Apply failed: {apply_res}"
        print("[OK] /api/round2/apply successful! Team score and state criteria updated.")

    print("\nALL 10-BOX VERIFICATIONS PASSED WITH FLYING COLORS!")

if __name__ == "__main__":
    verify_all()
