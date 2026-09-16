#!/usr/bin/env python3
"""
StateCraft Server
Full-featured HTTP & REST API server for StateCraft National Governance Simulation.
Runs with Python standard library - zero external dependencies needed!
"""

import http.server
import socketserver
import json
import os
import sys
import urllib.parse
import threading
import datetime
import uuid
import tempfile
import shutil

PORT = 8000
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "statecraft_db.json")
DEFAULT_DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "default_states.json")
MARKET_CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "market_config.json")
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

_ACTIVE_DB_FILE = None
_ACTIVE_MARKET_FILE = None

def get_active_db_file():
    global _ACTIVE_DB_FILE
    if _ACTIVE_DB_FILE is not None:
        return _ACTIVE_DB_FILE
    try:
        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
        test_file = os.path.join(os.path.dirname(DB_FILE), ".write_test")
        with open(test_file, "w") as f:
            f.write("1")
        if os.path.exists(test_file):
            os.remove(test_file)
        _ACTIVE_DB_FILE = DB_FILE
        return _ACTIVE_DB_FILE
    except (OSError, IOError, PermissionError):
        tmp_db = os.path.join(tempfile.gettempdir(), "statecraft_db.json")
        if not os.path.exists(tmp_db):
            source = DB_FILE if os.path.exists(DB_FILE) else DEFAULT_DB_FILE
            if source and os.path.exists(source):
                try:
                    shutil.copyfile(source, tmp_db)
                except Exception:
                    pass
        _ACTIVE_DB_FILE = tmp_db
        return _ACTIVE_DB_FILE

def get_active_market_file():
    global _ACTIVE_MARKET_FILE
    if _ACTIVE_MARKET_FILE is not None:
        return _ACTIVE_MARKET_FILE
    try:
        os.makedirs(os.path.dirname(MARKET_CONFIG_FILE), exist_ok=True)
        test_file = os.path.join(os.path.dirname(MARKET_CONFIG_FILE), ".market_write_test")
        with open(test_file, "w") as f:
            f.write("1")
        if os.path.exists(test_file):
            os.remove(test_file)
        _ACTIVE_MARKET_FILE = MARKET_CONFIG_FILE
        return _ACTIVE_MARKET_FILE
    except (OSError, IOError, PermissionError):
        tmp_market = os.path.join(tempfile.gettempdir(), "market_config.json")
        if not os.path.exists(tmp_market) and os.path.exists(MARKET_CONFIG_FILE):
            try:
                shutil.copyfile(MARKET_CONFIG_FILE, tmp_market)
            except Exception:
                pass
        _ACTIVE_MARKET_FILE = tmp_market
        return _ACTIVE_MARKET_FILE

DEFAULT_DEVELOPMENT_CATEGORIES = [
    "Education",
    "Healthcare",
    "Transport & Infrastructure",
    "Water & Sanitation",
    "Energy",
    "Agriculture",
    "Industry & Economy",
    "Environment",
    "Disaster Management",
    "Housing & Social Development",
    "Digital Development"
]

def load_market_config():
    target = get_active_market_file()
    if os.path.exists(target):
        try:
            with open(target, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[Error loading market config] {e}")
    if os.path.exists(MARKET_CONFIG_FILE):
        try:
            with open(MARKET_CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []

db_lock = threading.Lock()

def ensure_db_defaults(data):
    if not isinstance(data, dict):
        data = {}
    if "states" not in data:
        data["states"] = []
    if "teams" not in data:
        data["teams"] = []
    if "adminConfig" not in data:
        data["adminConfig"] = {"adminPasscode": "akshita"}
    if "buzzer" not in data or not isinstance(data["buzzer"], dict):
        data["buzzer"] = {
            "enabled": False,
            "showResults": False,
            "round": "Round 1: Rapid Response Buzzer",
            "activatedAt": None,
            "buzzes": []
        }
    else:
        data["buzzer"].setdefault("enabled", False)
        data["buzzer"].setdefault("showResults", False)
        data["buzzer"].setdefault("round", "Round 1: Rapid Response Buzzer")
        data["buzzer"].setdefault("activatedAt", None)
        data["buzzer"].setdefault("buzzes", [])
    if "round2" not in data or not isinstance(data["round2"], dict):
        data["round2"] = {
            "enabled": False,
            "title": "Round 2: Mystery Policy Matrix",
            "activatedAt": None,
            "teamSelections": {}
        }
    else:
        data["round2"].setdefault("enabled", False)
        data["round2"].setdefault("title", "Round 2: Mystery Policy Matrix")
        data["round2"].setdefault("activatedAt", None)
        data["round2"].setdefault("teamSelections", {})

    # Ensure all teams have development scores and market data
    for team in data.get("teams", []):
        team.setdefault("points", 0)
        team.setdefault("developmentScore", 0)
        team.setdefault("purchasedInfrastructure", [])
        if "categoryScores" not in team or not isinstance(team["categoryScores"], dict):
            team["categoryScores"] = {}
        for cat in DEFAULT_DEVELOPMENT_CATEGORIES:
            team["categoryScores"].setdefault(cat, 0)

    return data

def load_db():
    target = get_active_db_file()
    with db_lock:
        if not os.path.exists(target):
            source = DEFAULT_DB_FILE if os.path.exists(DEFAULT_DB_FILE) else DB_FILE
            if os.path.exists(source):
                with open(source, "r", encoding="utf-8") as f:
                    data = json.load(f)
                data = ensure_db_defaults(data)
                try:
                    with open(target, "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
                except Exception:
                    pass
                return data
            else:
                return ensure_db_defaults({"states": [], "teams": [], "adminConfig": {"adminPasscode": "akshita"}})
        try:
            with open(target, "r", encoding="utf-8") as f:
                data = json.load(f)
            return ensure_db_defaults(data)
        except Exception as e:
            print(f"[Error loading DB] {e}")
            if os.path.exists(DEFAULT_DB_FILE):
                with open(DEFAULT_DB_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return ensure_db_defaults(data)
            return ensure_db_defaults({"states": [], "teams": [], "adminConfig": {"adminPasscode": "akshita"}})

def save_db(data):
    target = get_active_db_file()
    with db_lock:
        data["adminConfig"]["lastUpdated"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        try:
            with open(target, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except (OSError, IOError, PermissionError):
            import tempfile
            tmp_target = os.path.join(tempfile.gettempdir(), "statecraft_db.json")
            with open(tmp_target, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

class StateCraftHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        if "directory" not in kwargs:
            kwargs["directory"] = STATIC_DIR
        super().__init__(*args, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def _set_cors_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_cors_headers(204)

    def _read_json_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length).decode("utf-8")
        try:
            return json.loads(body)
        except Exception:
            return {}

    def _send_json(self, data, status=200):
        self._set_cors_headers(status, "application/json")
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")

        if path == "" or path == "/":
            self.path = "/index.html"
            return super().do_GET()

        if path == "/api" or path == "/api/":
            db = load_db()
            return self._send_json({
                "status": "online",
                "message": "StateCraft API is running",
                "statesCount": len(db.get("states", [])),
                "teamsCount": len(db.get("teams", [])),
                "version": "1.0.0"
            })

        # REST API endpoints
        if path == "/api/status":
            db = load_db()
            return self._send_json({
                "status": "online",
                "time": datetime.datetime.now().isoformat(),
                "statesCount": len(db.get("states", [])),
                "teamsCount": len(db.get("teams", [])),
                "version": "1.0.0"
            })

        if path == "/api/data":
            db = load_db()
            return self._send_json(db)

        if path == "/api/states":
            db = load_db()
            return self._send_json(db.get("states", []))

        if path == "/api/teams":
            db = load_db()
            return self._send_json(db.get("teams", []))

        if path.startswith("/api/teams/"):
            team_id = path.split("/")[-1]
            db = load_db()
            team = next((t for t in db.get("teams", []) if t["id"] == team_id), None)
            if team:
                return self._send_json(team)
            return self._send_json({"error": "Team not found"}, 404)

        if path.startswith("/api/states/"):
            state_id = path.split("/")[-1]
            db = load_db()
            state = next((s for s in db.get("states", []) if s["id"] == state_id), None)
            if state:
                return self._send_json(state)
            return self._send_json({"error": "State not found"}, 404)

        if path == "/api/buzzer":
            db = load_db()
            buzzer = db.get("buzzer", {
                "enabled": False,
                "showResults": False,
                "round": "Round 1: Rapid Response Buzzer",
                "activatedAt": None,
                "buzzes": []
            })
            return self._send_json({"success": True, "buzzer": buzzer})

        if path == "/api/round2":
            db = load_db()
            round2 = db.get("round2", {
                "enabled": False,
                "title": "Round 2: Mystery Policy Matrix",
                "activatedAt": None,
                "teamSelections": {}
            })
            return self._send_json({"success": True, "round2": round2})

        if path == "/api/market/config":
            items = load_market_config()
            return self._send_json({
                "success": True, 
                "items": items, 
                "categories": DEFAULT_DEVELOPMENT_CATEGORIES
            })

        # Return JSON 404 for unknown API endpoints
        if path.startswith("/api"):
            return self._send_json({"error": "Endpoint not found"}, 404)

        # Fallback to serving static files
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        body = self._read_json_body()
        db = load_db()

        # 1. Admin Login
        if path == "/api/admin/login":
            passcode = body.get("passcode", "").strip()
            correct_code = db.get("adminConfig", {}).get("adminPasscode", "akshita")
            if passcode == correct_code:
                return self._send_json({
                    "success": True,
                    "message": "Admin authenticated successfully",
                    "adminToken": "adm_" + uuid.uuid4().hex[:12]
                })
            return self._send_json({"success": False, "error": "Invalid Admin Passcode"}, 401)

        # 2. Participant Login
        if path == "/api/participant/login":
            team_name = body.get("teamName", "").strip().lower()
            password = body.get("password", "").strip()

            team = next((t for t in db.get("teams", []) if t["name"].strip().lower() == team_name and t.get("password") == password), None)
            if not team:
                return self._send_json({"success": False, "error": "Invalid Team Name or Password"}, 401)

            state = None
            if team.get("allocatedStateId"):
                state = next((s for s in db.get("states", []) if s["id"] == team["allocatedStateId"]), None)

            return self._send_json({
                "success": True,
                "team": team,
                "allocatedState": state
            })

        # 3. Create Team (Admin only)
        if path == "/api/teams":
            name = body.get("name", "").strip()
            password = body.get("password", "").strip()
            state_id = body.get("allocatedStateId", "")

            if not name or not password:
                return self._send_json({"success": False, "error": "Team Name and Password are required"}, 400)

            # Check if team name already exists
            if any(t["name"].strip().lower() == name.lower() for t in db.get("teams", [])):
                return self._send_json({"success": False, "error": f"A team named '{name}' already exists"}, 400)

            # Check if state is already allocated
            if state_id:
                allocated_by = next((t for t in db.get("teams", []) if t.get("allocatedStateId") == state_id), None)
                if allocated_by:
                    return self._send_json({"success": False, "error": f"This state is already allocated to {allocated_by['name']}"}, 400)

            new_team = {
                "id": f"team_{uuid.uuid4().hex[:8]}",
                "name": name,
                "password": password,
                "allocatedStateId": state_id or None,
                "points": 0,
                "developmentScore": 0,
                "categoryScores": {cat: 0 for cat in DEFAULT_DEVELOPMENT_CATEGORIES},
                "purchasedInfrastructure": [],
                "pointLogs": [
                    {
                        "id": f"log_{uuid.uuid4().hex[:6]}",
                        "pointsChange": 0,
                        "category": "System Initialized",
                        "reason": "Team registered and initialized in the simulation.",
                        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    }
                ]
            }
            db["teams"].append(new_team)
            save_db(db)
            return self._send_json({"success": True, "team": new_team}, 201)

        # 4. Award / Modify Team Points (Admin only)
        if path.startswith("/api/teams/") and path.endswith("/points"):
            parts = path.split("/")
            team_id = parts[3]
            team = next((t for t in db.get("teams", []) if t["id"] == team_id), None)
            if not team:
                return self._send_json({"success": False, "error": "Team not found"}, 404)

            try:
                change = int(body.get("pointsChange", 0))
            except (ValueError, TypeError):
                return self._send_json({"success": False, "error": "Invalid points value"}, 400)

            category = body.get("category", "").strip() or "Round Evaluation"
            reason = body.get("reason", "").strip() or "Points awarded by Admin"

            team["points"] = max(0, team.get("points", 0) + change)
            if "pointLogs" not in team:
                team["pointLogs"] = []

            log_entry = {
                "id": f"log_{uuid.uuid4().hex[:6]}",
                "pointsChange": change,
                "category": category,
                "reason": reason,
                "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            team["pointLogs"].insert(0, log_entry)

            save_db(db)
            return self._send_json({"success": True, "team": team, "addedLog": log_entry})

        # 5. Reset Database
        if path == "/api/reset":
            if os.path.exists(DEFAULT_DB_FILE):
                with open(DEFAULT_DB_FILE, "r", encoding="utf-8") as f:
                    default_data = json.load(f)
                save_db(default_data)
                return self._send_json({"success": True, "message": "Database reset to initial defaults successfully"})
            return self._send_json({"success": False, "error": "Default seed file not found"}, 500)

        # 6. Update Admin Config
        if path == "/api/admin/config":
            new_title = body.get("eventTitle")
            new_round = body.get("roundName")
            new_passcode = body.get("adminPasscode")

            if new_title:
                db["adminConfig"]["eventTitle"] = new_title
            if new_round:
                db["adminConfig"]["roundName"] = new_round
            if new_passcode:
                db["adminConfig"]["adminPasscode"] = new_passcode

            save_db(db)
            return self._send_json({"success": True, "adminConfig": db["adminConfig"]})

        # 7. Buzzer Endpoints (Round 1)
        if path == "/api/buzzer/toggle":
            enabled = bool(body.get("enabled", False))
            buzzer = db.setdefault("buzzer", {
                "enabled": False,
                "showResults": False,
                "round": "Round 1: Rapid Response Buzzer",
                "activatedAt": None,
                "buzzes": []
            })
            buzzer["enabled"] = enabled
            if enabled:
                buzzer["activatedAt"] = datetime.datetime.now().isoformat()
            else:
                buzzer["activatedAt"] = None
            save_db(db)
            return self._send_json({"success": True, "buzzer": buzzer})

        if path == "/api/buzzer/reveal":
            show_results = bool(body.get("showResults", False))
            buzzer = db.setdefault("buzzer", {
                "enabled": False,
                "showResults": False,
                "round": "Round 1: Rapid Response Buzzer",
                "activatedAt": None,
                "buzzes": []
            })
            buzzer["showResults"] = show_results
            save_db(db)
            return self._send_json({"success": True, "buzzer": buzzer})

        if path == "/api/buzzer/reset":
            round_name = body.get("round") or db.get("buzzer", {}).get("round", "Round 1: Rapid Response Buzzer")
            db["buzzer"] = {
                "enabled": False,
                "showResults": False,
                "round": round_name,
                "activatedAt": None,
                "buzzes": []
            }
            save_db(db)
            return self._send_json({"success": True, "message": "Buzzer reset successfully", "buzzer": db["buzzer"]})

        if path == "/api/buzzer/buzz":
            buzzer = db.setdefault("buzzer", {
                "enabled": False,
                "showResults": False,
                "round": "Round 1: Rapid Response Buzzer",
                "activatedAt": None,
                "buzzes": []
            })

            if not buzzer.get("enabled", False):
                return self._send_json({
                    "success": False,
                    "error": "Buzzer is currently locked! Please wait for the admin to enable the buzzer."
                }, 400)

            team_id = body.get("teamId", "").strip()
            if not team_id:
                return self._send_json({"success": False, "error": "Team ID is required to buzz"}, 400)

            team = next((t for t in db.get("teams", []) if t["id"] == team_id), None)
            if not team:
                return self._send_json({"success": False, "error": "Team not recognized in database"}, 404)

            # Check if team already buzzed in current cycle
            existing = next((b for b in buzzer.get("buzzes", []) if b.get("teamId") == team_id), None)
            if existing:
                return self._send_json({
                    "success": False,
                    "error": f"Your team has already pressed the buzzer! You are #{existing['order']} in order.",
                    "existingBuzz": existing,
                    "buzzer": buzzer
                }, 400)

            now_dt = datetime.datetime.now()
            elapsed_ms = 0
            if buzzer.get("activatedAt"):
                try:
                    act_dt = datetime.datetime.fromisoformat(buzzer["activatedAt"])
                    elapsed_ms = max(0, int((now_dt - act_dt).total_seconds() * 1000))
                except Exception:
                    elapsed_ms = 0

            state_name = "Unallocated State"
            if team.get("allocatedStateId"):
                state = next((s for s in db.get("states", []) if s["id"] == team["allocatedStateId"]), None)
                if state:
                    state_name = state.get("name", state_name)

            order_num = len(buzzer.get("buzzes", [])) + 1
            buzz_record = {
                "order": order_num,
                "teamId": team["id"],
                "teamName": team["name"],
                "stateName": state_name,
                "timestamp": now_dt.strftime("%H:%M:%S.%f")[:-3],
                "elapsedMs": elapsed_ms
            }

            buzzer["buzzes"].append(buzz_record)
            save_db(db)
            return self._send_json({
                "success": True,
                "buzz": buzz_record,
                "order": order_num,
                "buzzer": buzzer
            })

        # 8. Round 2: Mystery Box Policy Endpoints
        if path == "/api/round2/toggle":
            enabled = bool(body.get("enabled", False))
            round2 = db.setdefault("round2", {
                "enabled": False,
                "title": "Round 2: Mystery Policy Matrix",
                "activatedAt": None,
                "teamSelections": {}
            })
            round2["enabled"] = enabled
            if enabled:
                round2["activatedAt"] = datetime.datetime.now().isoformat()
            else:
                round2["activatedAt"] = None
            save_db(db)
            return self._send_json({"success": True, "round2": round2})

        if path == "/api/round2/reset":
            round2 = db.setdefault("round2", {
                "enabled": False,
                "title": "Round 2: Mystery Policy Matrix",
                "activatedAt": None,
                "teamSelections": {}
            })
            target_team_id = body.get("teamId")
            if target_team_id:
                if target_team_id in round2.get("teamSelections", {}):
                    del round2["teamSelections"][target_team_id]
            else:
                round2["teamSelections"] = {}
                if body.get("disable", False):
                    round2["enabled"] = False
                    round2["activatedAt"] = None
            save_db(db)
            return self._send_json({"success": True, "message": "Round 2 selections reset successfully", "round2": round2})

        if path == "/api/round2/submit":
            round2 = db.setdefault("round2", {
                "enabled": False,
                "title": "Round 2: Mystery Policy Matrix",
                "activatedAt": None,
                "teamSelections": {}
            })

            is_admin_call = bool(body.get("fromAdmin", False))
            if not is_admin_call and not round2.get("enabled", True):
                return self._send_json({
                    "success": False,
                    "error": "Round 2 is currently locked by the administrator! Please wait for admin activation."
                }, 400)

            team_id = body.get("teamId", "").strip()
            if not team_id:
                return self._send_json({"success": False, "error": "Team ID is required to submit Round 2 selections"}, 400)

            team = next((t for t in db.get("teams", []) if t["id"] == team_id), None)
            if not team:
                return self._send_json({"success": False, "error": "Team not recognized in database"}, 404)

            criteria_key = body.get("criteriaKey", "").strip()
            criteria_title = body.get("criteriaTitle", criteria_key.capitalize())
            chosen_boxes = body.get("chosenBoxes", [])

            if not criteria_key or not isinstance(chosen_boxes, list) or len(chosen_boxes) < 1:
                return self._send_json({
                    "success": False,
                    "error": "At least 1 policy box must be chosen."
                }, 400)

            if not is_admin_call and len(chosen_boxes) != 3:
                return self._send_json({
                    "success": False,
                    "error": "Exactly 3 mystery boxes must be chosen for the selected criteria."
                }, 400)

            # Mandatory Rule Validation (only for non-admin participants if applicable):
            if not is_admin_call:
                has_disadvantageous = any(
                    str(b.get("type", "")).lower() in ("disadvantageous", "trade_off", "external_sector")
                    for b in chosen_boxes
                )
                if not has_disadvantageous:
                    return self._send_json({
                        "success": False,
                        "error": "Strategic constraint violation: It is mandatory that at least 1 trade-off box is included in your package!"
                    }, 400)

            # Calculate total net impacts
            net_team_score = sum(int(b.get("teamPointsChange", 0)) for b in chosen_boxes)
            criteria_impacts = {}
            for b in chosen_boxes:
                target_crit = b.get("targetCriterion") or criteria_key
                pts_change = int(b.get("criteriaPointsChange", 0))
                criteria_impacts[target_crit] = criteria_impacts.get(target_crit, 0) + pts_change

            state_name = "Unallocated State"
            if team.get("allocatedStateId"):
                state = next((s for s in db.get("states", []) if s["id"] == team["allocatedStateId"]), None)
                if state:
                    state_name = state.get("name", state_name)

            selection_record = {
                "teamId": team["id"],
                "teamName": team["name"],
                "allocatedStateId": team.get("allocatedStateId"),
                "stateName": state_name,
                "criteriaKey": criteria_key,
                "criteriaTitle": criteria_title,
                "chosenBoxes": chosen_boxes,
                "netTeamScore": net_team_score,
                "criteriaImpacts": criteria_impacts,
                "submittedAt": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "applied": False
            }

            round2.setdefault("teamSelections", {})[team_id] = selection_record
            save_db(db)
            return self._send_json({
                "success": True,
                "selection": selection_record,
                "round2": round2
            })

        if path == "/api/round2/apply":
            team_id = body.get("teamId", "").strip()
            if not team_id:
                return self._send_json({"success": False, "error": "Team ID is required to apply Round 2 impacts"}, 400)

            round2 = db.get("round2", {})
            team_selections = round2.get("teamSelections", {})
            selection = team_selections.get(team_id)
            if not selection:
                return self._send_json({"success": False, "error": "No Round 2 submission found for this team"}, 404)

            team = next((t for t in db.get("teams", []) if t["id"] == team_id), None)
            if not team:
                return self._send_json({"success": False, "error": "Team not found"}, 404)

            # Apply net score to team points
            pts_change = int(selection.get("netTeamScore", 0))
            team["points"] = max(0, team.get("points", 0) + pts_change)

            if "pointLogs" not in team:
                team["pointLogs"] = []

            crit_title = selection.get("criteriaTitle", "Sector")
            log_entry = {
                "id": f"log_{uuid.uuid4().hex[:6]}",
                "pointsChange": pts_change,
                "category": "Round 2: Policy Reform",
                "reason": f"Round 2 Mystery Box Package applied ({crit_title} reforms).",
                "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            team["pointLogs"].insert(0, log_entry)

            # Apply criteria impacts to allocated state if present
            state = None
            if team.get("allocatedStateId"):
                state = next((s for s in db.get("states", []) if s["id"] == team["allocatedStateId"]), None)
                if state and "criteria" in state:
                    for c_key, c_change in selection.get("criteriaImpacts", {}).items():
                        if c_key in state["criteria"]:
                            cur_pts = state["criteria"][c_key].get("points", 50)
                            state["criteria"][c_key]["points"] = max(0, min(100, cur_pts + int(c_change)))

            selection["applied"] = True
            selection["appliedAt"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            save_db(db)

            return self._send_json({
                "success": True,
                "message": f"Successfully applied Round 2 policy impacts to {team['name']}",
                "selection": selection,
                "team": team,
                "state": state
            })

        # Infrastructure Market: Authoritative Purchase
        if path == "/api/market/buy":
            team_id = body.get("teamId", "").strip()
            item_id = body.get("itemId", "").strip()
            password = body.get("password", "").strip()

            if not team_id or not item_id:
                return self._send_json({"success": False, "error": "Team ID and Item ID are required"}, 400)

            team = next((t for t in db.get("teams", []) if t["id"] == team_id), None)
            if not team:
                return self._send_json({"success": False, "error": "Team not found"}, 404)

            # Team security validation: ensure request credentials match
            if team.get("password"):
                if not password or team.get("password") != password:
                    return self._send_json({"success": False, "error": "Unauthorized: Invalid team credentials"}, 401)

            market_items = load_market_config()
            item = next((i for i in market_items if i["id"] == item_id), None)
            if not item:
                return self._send_json({"success": False, "error": "Infrastructure item not found"}, 404)

            # Ensure data structures
            if "purchasedInfrastructure" not in team or not isinstance(team["purchasedInfrastructure"], list):
                team["purchasedInfrastructure"] = []
            if "categoryScores" not in team or not isinstance(team["categoryScores"], dict):
                team["categoryScores"] = {cat: 0 for cat in DEFAULT_DEVELOPMENT_CATEGORIES}

            # Check if already purchased (One-time purchase per team)
            if any(p.get("id") == item_id for p in team["purchasedInfrastructure"]):
                return self._send_json({
                    "success": False,
                    "error": f"'{item['name']}' has already been purchased by your state."
                }, 400)

            cost = int(item.get("cost", 0))
            bonus = int(item.get("bonus", cost))
            category = item.get("category", "Digital Development")

            # Validate sufficient points
            cur_points = int(team.get("points", 0))
            if cur_points < cost:
                return self._send_json({
                    "success": False,
                    "error": "Insufficient points to purchase this infrastructure."
                }, 400)

            # Deduct points and apply development bonus
            team["points"] = cur_points - cost
            team["developmentScore"] = int(team.get("developmentScore", 0)) + bonus
            team["categoryScores"][category] = int(team["categoryScores"].get(category, 0)) + bonus

            purchase_record = {
                "id": item["id"],
                "name": item["name"],
                "icon": item.get("icon", "🏗️"),
                "category": category,
                "cost": cost,
                "bonus": bonus,
                "purchasedAt": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            team["purchasedInfrastructure"].append(purchase_record)

            # Permanent audit log in pointLogs
            log_entry = {
                "id": f"log_{uuid.uuid4().hex[:6]}",
                "pointsChange": -cost,
                "category": f"Infrastructure: {category}",
                "reason": f"Invested in {item['name']} (+{bonus} {category} Dev Points)",
                "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            if "pointLogs" not in team:
                team["pointLogs"] = []
            team["pointLogs"].insert(0, log_entry)

            save_db(db)
            return self._send_json({
                "success": True,
                "message": f"{item['name']} has been added to your state's infrastructure.",
                "purchase": purchase_record,
                "team": team
            })

        # Infrastructure Market: Update Configuration (Admin)
        if path == "/api/market/config":
            new_items = body.get("items", [])
            if not isinstance(new_items, list) or len(new_items) == 0:
                return self._send_json({"success": False, "error": "Invalid items configuration"}, 400)
            
            try:
                target = get_active_market_file()
                with open(target, "w", encoding="utf-8") as f:
                    json.dump(new_items, f, indent=2, ensure_ascii=False)
                return self._send_json({"success": True, "message": "Market configuration saved successfully", "items": new_items})
            except Exception as e:
                try:
                    import tempfile
                    tmp_target = os.path.join(tempfile.gettempdir(), "market_config.json")
                    with open(tmp_target, "w", encoding="utf-8") as f:
                        json.dump(new_items, f, indent=2, ensure_ascii=False)
                    return self._send_json({"success": True, "message": "Market configuration saved successfully", "items": new_items})
                except Exception as inner_e:
                    return self._send_json({"success": False, "error": f"Failed to save market configuration: {str(inner_e)}"}, 500)

        # Infrastructure Market: Reset (Admin only)
        if path == "/api/market/reset":
            team_id = body.get("teamId", "").strip()
            refund = body.get("refundPoints", False)
            
            def reset_team_market(t):
                if refund and "purchasedInfrastructure" in t:
                    total_cost = sum(int(p.get("cost", 0)) for p in t["purchasedInfrastructure"])
                    t["points"] = int(t.get("points", 0)) + total_cost
                    if total_cost > 0:
                        if "pointLogs" not in t:
                            t["pointLogs"] = []
                        t["pointLogs"].insert(0, {
                            "id": f"log_{uuid.uuid4().hex[:6]}",
                            "pointsChange": total_cost,
                            "category": "Market Reset Refund",
                            "reason": f"Points refunded from infrastructure reset (+{total_cost} pts)",
                            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        })
                t["purchasedInfrastructure"] = []
                t["developmentScore"] = 0
                t["categoryScores"] = {cat: 0 for cat in DEFAULT_DEVELOPMENT_CATEGORIES}

            if team_id:
                team = next((t for t in db.get("teams", []) if t["id"] == team_id), None)
                if team:
                    reset_team_market(team)
                    save_db(db)
                    return self._send_json({"success": True, "message": f"Market reset for team {team['name']}", "team": team})
                return self._send_json({"success": False, "error": "Team not found"}, 404)
            else:
                for t in db.get("teams", []):
                    reset_team_market(t)
                save_db(db)
                return self._send_json({"success": True, "message": "Market reset for all teams"})

        return self._send_json({"error": "Endpoint not found"}, 404)

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        body = self._read_json_body()
        db = load_db()

        # Update Team (Edit name, password, or reallocate state)
        if path.startswith("/api/teams/"):
            team_id = path.split("/")[-1]
            team = next((t for t in db.get("teams", []) if t["id"] == team_id), None)
            if not team:
                return self._send_json({"success": False, "error": "Team not found"}, 404)

            name = body.get("name", "").strip()
            password = body.get("password", "").strip()
            state_id = body.get("allocatedStateId")

            if name:
                # Check uniqueness if name changed
                if any(t["name"].strip().lower() == name.lower() and t["id"] != team_id for t in db.get("teams", [])):
                    return self._send_json({"success": False, "error": f"A team named '{name}' already exists"}, 400)
                team["name"] = name

            if password:
                team["password"] = password

            if state_id is not None:
                if state_id != "":
                    # Check if allocated to someone else
                    taken_by = next((t for t in db.get("teams", []) if t.get("allocatedStateId") == state_id and t["id"] != team_id), None)
                    if taken_by:
                        return self._send_json({"success": False, "error": f"This state is already allocated to {taken_by['name']}"}, 400)
                    team["allocatedStateId"] = state_id
                else:
                    team["allocatedStateId"] = None

            save_db(db)
            return self._send_json({"success": True, "team": team})

        # Update State Criteria (Admin modifies predefined criteria values or descriptions)
        if path.startswith("/api/states/"):
            state_id = path.split("/")[-1]
            state = next((s for s in db.get("states", []) if s["id"] == state_id), None)
            if not state:
                return self._send_json({"success": False, "error": "State not found"}, 404)

            # Update criteria dictionary
            if "criteria" in body:
                for crit_key, crit_val in body["criteria"].items():
                    if crit_key in state["criteria"]:
                        state["criteria"][crit_key].update(crit_val)
                        if "points" in state["criteria"][crit_key]:
                            try:
                                state["criteria"][crit_key]["points"] = int(state["criteria"][crit_key]["points"])
                            except (ValueError, TypeError):
                                pass

            # Update single criteria directly if sent as { criteriaKey, value, subValue, responsibility, status, points }
            if "criteriaKey" in body:
                ck = body["criteriaKey"]
                if ck in state["criteria"]:
                    if "value" in body: state["criteria"][ck]["value"] = body["value"]
                    if "subValue" in body: state["criteria"][ck]["subValue"] = body["subValue"]
                    if "responsibility" in body: state["criteria"][ck]["responsibility"] = body["responsibility"]
                    if "status" in body: state["criteria"][ck]["status"] = body["status"]
                    if "points" in body:
                        try:
                            state["criteria"][ck]["points"] = int(body["points"])
                        except (ValueError, TypeError):
                            pass

            # Calculate total points across all 8 criteria for this state
            total_criteria_pts = 0
            for ck, cv in state.get("criteria", {}).items():
                pts = int(cv.get("points", 0)) if "points" in cv and cv["points"] is not None else 0
                total_criteria_pts += pts

            # Note: Team score is independent from state criteria points!
            # The team's score is awarded strictly based on round participation.
            save_db(db)
            return self._send_json({
                "success": True, 
                "state": state, 
                "totalCriteriaPoints": total_criteria_pts
            })

        return self._send_json({"error": "Endpoint not found"}, 404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        db = load_db()

        # Delete Team
        if path.startswith("/api/teams/"):
            team_id = path.split("/")[-1]
            initial_count = len(db.get("teams", []))
            db["teams"] = [t for t in db.get("teams", []) if t["id"] != team_id]

            if len(db["teams"]) == initial_count:
                return self._send_json({"success": False, "error": "Team not found"}, 404)

            save_db(db)
            return self._send_json({"success": True, "message": f"Team {team_id} deleted and state allocation released."})

        return self._send_json({"error": "Endpoint not found"}, 404)

def run_server(port=PORT):
    # Allow immediate reuse of address
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    server_address = ("", port)
    attempts = 0
    httpd = None

    while attempts < 10:
        try:
            httpd = socketserver.ThreadingTCPServer(server_address, StateCraftHandler)
            print(f"==================================================", flush=True)
            print(f"  STATECRAFT SERVER RUNNING", flush=True)
            print(f"  Main Gateway:       http://localhost:{port}/", flush=True)
            print(f"  Admin Portal:       http://localhost:{port}/admin.html", flush=True)
            print(f"  Participant Portal: http://localhost:{port}/participant.html", flush=True)
            print(f"==================================================", flush=True)
            break
        except OSError as e:
            port += 1
            server_address = ("", port)
            attempts += 1

    if not httpd:
        print("Failed to bind to a free port.", flush=True)
        sys.exit(1)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server gracefully...", flush=True)
        httpd.server_close()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        print("Server test mode: database loading verified.")
        test_db = load_db()
        print(f"States loaded: {len(test_db.get('states', []))}, Teams: {len(test_db.get('teams', []))}")
        sys.exit(0)
    
    port_to_use = PORT
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port_to_use = int(sys.argv[1])
    
    run_server(port_to_use)
