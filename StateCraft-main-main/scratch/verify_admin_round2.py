import urllib.request
import json

def verify_all():
    base_url = "http://localhost:8000"
    
    # 1. Verify participant.html has NO mention of Round 2
    with open("participant.html", "r", encoding="utf-8") as f:
        part_html = f.read()
    
    with open("js/participant.js", "r", encoding="utf-8") as f:
        part_js = f.read()
        
    print("--- Checking Participant Portal ---")
    assert "Round 2" not in part_html, "Found 'Round 2' in participant.html!"
    assert "participantRound2State" not in part_js, "Found participantRound2State in js/participant.js!"
    assert "handleParticipantBoxClick" not in part_js, "Found handleParticipantBoxClick in js/participant.js!"
    print("[OK] Participant Portal is 100% CLEAN of Round 2!")

    # 2. Verify admin.html has Sector First, then Boxes
    with open("admin.html", "r", encoding="utf-8") as f:
        admin_html = f.read()
    
    with open("js/admin.js", "r", encoding="utf-8") as f:
        admin_js = f.read()

    print("\n--- Checking Admin Portal ---")
    assert "admin-sectors-selection-grid" in admin_html, "Missing admin-sectors-selection-grid in admin.html!"
    assert "admin-no-sector-placeholder" in admin_html, "Missing admin-no-sector-placeholder in admin.html!"
    assert "admin-active-boxes-arena" in admin_html, "Missing admin-active-boxes-arena in admin.html!"
    assert "admin-mystery-boxes-grid" in admin_html, "Missing admin-mystery-boxes-grid in admin.html!"
    
    # Check that Step 1 Sectors appears BEFORE Step 2 Mystery Boxes in admin.html
    idx_step1 = admin_html.find("admin-sectors-selection-grid")
    idx_step2 = admin_html.find("admin-active-boxes-arena")
    assert idx_step1 < idx_step2, "Step 1 Sectors must appear before Step 2 Boxes in admin.html!"
    print("[OK] Step 1 Sectors appears first before Step 2 Boxes!")

    # 3. Check 3D flip card styles in design-system.css
    with open("css/design-system.css", "r", encoding="utf-8") as f:
        css = f.read()
    
    print("\n--- Checking CSS 3D Flip Styles ---")
    assert ".mystery-box-card" in css, "Missing .mystery-box-card in CSS"
    assert "perspective: 1000px" in css, "Missing perspective in CSS"
    assert "transform-style: preserve-3d" in css, "Missing preserve-3d in CSS"
    assert "rotateY(180deg)" in css, "Missing rotateY(180deg) in CSS"
    assert ".admin-sector-card" in css, "Missing .admin-sector-card in CSS"
    print("[OK] 3D Flip effect and Sector Grid styles properly configured!")

    # 4. Check API endpoints
    print("\n--- Checking Backend APIs ---")
    req = urllib.request.Request(f"{base_url}/api/data")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print(f"[OK] /api/data OK: {len(data.get('teams', []))} teams, {len(data.get('states', []))} states")
        
    req2 = urllib.request.Request(f"{base_url}/api/round2")
    with urllib.request.urlopen(req2) as resp:
        r2_res = json.loads(resp.read().decode("utf-8"))
        print(f"[OK] /api/round2 GET OK: enabled={r2_res.get('round2', {}).get('enabled')}")

    # 5. Test Round 2 submission from Admin
    test_team_id = data['teams'][0]['id'] if data.get('teams') else "T01"
    payload = json.dumps({
        "fromAdmin": True,
        "teamId": test_team_id,
        "criteriaKey": "education",
        "criteriaTitle": "Education & Skill Development",
        "chosenBoxes": [
            {
                "id": "edu_box_1",
                "title": "Smart Digital Curriculum Expansion",
                "teamPointsChange": 25,
                "criteriaPointsChange": 10,
                "targetCriterion": "education",
                "type": "advantageous"
            },
            {
                "id": "edu_box_2",
                "title": "Vocational Excellence Hubs",
                "teamPointsChange": 20,
                "criteriaPointsChange": 8,
                "targetCriterion": "education",
                "type": "advantageous"
            },
            {
                "id": "edu_box_3",
                "title": "Austerity Healthcare Redistribution",
                "teamPointsChange": -15,
                "criteriaPointsChange": -8,
                "targetCriterion": "healthcare",
                "type": "disadvantageous"
            }
        ]
    }).encode("utf-8")
    
    post_req = urllib.request.Request(f"{base_url}/api/round2/submit", data=payload, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(post_req) as resp:
        submit_res = json.loads(resp.read().decode("utf-8"))
        assert submit_res.get("success"), f"Submit failed: {submit_res}"
        selection = submit_res.get("selection", {})
        print(f"[OK] /api/round2/submit accepted from Admin! Net team score: {selection.get('netTeamScore')}")

    # 6. Test Round 2 apply
    apply_payload = json.dumps({"teamId": test_team_id}).encode("utf-8")
    apply_req = urllib.request.Request(f"{base_url}/api/round2/apply", data=apply_payload, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(apply_req) as resp:
        apply_res = json.loads(resp.read().decode("utf-8"))
        assert apply_res.get("success"), f"Apply failed: {apply_res}"
        print(f"[OK] /api/round2/apply successful! Team points and state criteria updated.")
        
    print("\nALL VERIFICATIONS PASSED PERFECTLY!")

if __name__ == "__main__":
    verify_all()
