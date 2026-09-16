import sys
import os
import io
import json
from http.server import HTTPServer

# Add project root to sys.path
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from api.index import handler
import server

class MockSocket:
    def __init__(self, request_bytes):
        self.rfile = io.BytesIO(request_bytes)
        self.wfile = io.BytesIO()

    def sendall(self, b):
        self.wfile.write(b)

    def makefile(self, mode, *args, **kwargs):
        if "b" in mode:
            if "r" in mode:
                return self.rfile
            else:
                return self.wfile
        raise ValueError("Only binary mode supported in mock")

def execute_mock_request(method, path, headers=None, body=b""):
    if headers is None:
        headers = {}
    
    headers_str = f"{method} {path} HTTP/1.1\r\nHost: state-craft-wheat.vercel.app\r\n"
    if body:
        headers["Content-Length"] = str(len(body))
    for k, v in headers.items():
        headers_str += f"{k}: {v}\r\n"
    headers_str += "\r\n"
    
    raw_req = headers_str.encode("utf-8") + body
    mock_sock = MockSocket(raw_req)

    # Initialize handler
    # BaseHTTPRequestHandler __init__ takes (request, client_address, server)
    inst = handler(mock_sock, ("127.0.0.1", 12345), None)
    
    output = mock_sock.wfile.getvalue()
    # Parse status and headers from response
    parts = output.split(b"\r\n\r\n", 1)
    header_part = parts[0].decode("utf-8")
    body_part = parts[1] if len(parts) > 1 else b""
    
    status_line = header_part.split("\r\n")[0]
    status_code = int(status_line.split(" ")[1])
    
    try:
        resp_json = json.loads(body_part.decode("utf-8"))
    except Exception:
        resp_json = body_part.decode("utf-8", errors="replace")
        
    return status_code, header_part, resp_json

def run_tests():
    print("=== TESTING STATECRAFT VERCEL HANDLER ===")
    
    # 1. GET /api/status
    code, hdr, data = execute_mock_request("GET", "/api/status")
    print(f"1. GET /api/status -> HTTP {code}: {data.get('status', '')}")
    assert code == 200, f"Expected 200, got {code}"
    assert data.get("status") == "online"

    # 2. GET /api/data
    code, hdr, data = execute_mock_request("GET", "/api/data")
    print(f"2. GET /api/data -> HTTP {code}: states={len(data.get('states', []))}, teams={len(data.get('teams', []))}")
    assert code == 200, f"Expected 200, got {code}"
    assert "states" in data and "teams" in data

    # 3. GET /api/states
    code, hdr, data = execute_mock_request("GET", "/api/states")
    print(f"3. GET /api/states -> HTTP {code}: count={len(data)}")
    assert code == 200, f"Expected 200, got {code}"
    assert isinstance(data, list) and len(data) > 0

    # 4. GET /api/teams
    code, hdr, data = execute_mock_request("GET", "/api/teams")
    print(f"4. GET /api/teams -> HTTP {code}: count={len(data)}")
    assert code == 200, f"Expected 200, got {code}"
    assert isinstance(data, list)

    # 5. GET /api/buzzer
    code, hdr, data = execute_mock_request("GET", "/api/buzzer")
    print(f"5. GET /api/buzzer -> HTTP {code}: success={data.get('success')}")
    assert code == 200, f"Expected 200, got {code}"
    assert data.get("success") is True

    # 6. GET /api/round2
    code, hdr, data = execute_mock_request("GET", "/api/round2")
    print(f"6. GET /api/round2 -> HTTP {code}: success={data.get('success')}")
    assert code == 200, f"Expected 200, got {code}"
    assert data.get("success") is True

    # 7. GET /api/market/config
    code, hdr, data = execute_mock_request("GET", "/api/market/config")
    print(f"7. GET /api/market/config -> HTTP {code}: items count={len(data.get('items', []))}")
    assert code == 200, f"Expected 200, got {code}"
    assert data.get("success") is True

    # 8. GET /api (Root API info)
    code, hdr, data = execute_mock_request("GET", "/api")
    print(f"8. GET /api -> HTTP {code}: {data.get('message', '')}")
    assert code == 200, f"Expected 200, got {code}"

    # 9. OPTIONS /api/admin/login (CORS Preflight)
    code, hdr, data = execute_mock_request("OPTIONS", "/api/admin/login")
    print(f"9. OPTIONS /api/admin/login -> HTTP {code}")
    assert code == 204, f"Expected 204, got {code}"
    assert "Access-Control-Allow-Origin: *" in hdr
    assert "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS" in hdr

    # 10. POST /api/admin/login with correct passcode (akshita)
    body = json.dumps({"passcode": "akshita"}).encode("utf-8")
    code, hdr, data = execute_mock_request("POST", "/api/admin/login", {"Content-Type": "application/json"}, body)
    print(f"10. POST /api/admin/login (akshita) -> HTTP {code}: {data.get('message', '')}")
    assert code == 200, f"Expected 200, got {code}"
    assert data.get("success") is True and "adminToken" in data

    # 11. POST /api/admin/login with incorrect passcode
    body = json.dumps({"passcode": "wrong_passcode"}).encode("utf-8")
    code, hdr, data = execute_mock_request("POST", "/api/admin/login", {"Content-Type": "application/json"}, body)
    print(f"11. POST /api/admin/login (wrong) -> HTTP {code}: error={data.get('error', '')}")
    assert code == 401, f"Expected 401, got {code}"
    assert data.get("success") is False

    # 12. POST /api/participant/login
    db = server.load_db()
    first_team = db.get("teams", [])[0]
    body = json.dumps({"teamName": first_team["name"], "password": first_team["password"]}).encode("utf-8")
    code, hdr, data = execute_mock_request("POST", "/api/participant/login", {"Content-Type": "application/json"}, body)
    print(f"12. POST /api/participant/login -> HTTP {code}: team={data.get('team', {}).get('name')}")
    assert code == 200, f"Expected 200, got {code}"
    assert data.get("success") is True

    # 13. Vercel Rewrite Simulation: x-matched-path header
    # On Vercel, self.path might be /api/index.py while x-matched-path is /api/admin/login
    body = json.dumps({"passcode": "akshita"}).encode("utf-8")
    headers = {"Content-Type": "application/json", "x-matched-path": "/api/admin/login"}
    code, hdr, data = execute_mock_request("POST", "/api/index.py", headers, body)
    print(f"13. Vercel Rewrite x-matched-path (/api/admin/login) -> HTTP {code}: {data.get('message', '')}")
    assert code == 200, f"Expected 200, got {code}"
    assert data.get("success") is True

    # 14. Unknown API Endpoint 404 JSON Response
    code, hdr, data = execute_mock_request("GET", "/api/nonexistent_route")
    print(f"14. GET /api/nonexistent_route -> HTTP {code}: {data}")
    assert code == 404, f"Expected 404, got {code}"
    assert isinstance(data, dict) and data.get("error") == "Endpoint not found"

    # 15. Verify Static Files Exist
    for f in ["index.html", "admin.html", "participant.html"]:
        path = os.path.join(ROOT, f)
        assert os.path.exists(path), f"Missing {f}"
        assert os.path.getsize(path) > 0, f"Empty {f}"
    print("15. Static files (index.html, admin.html, participant.html) verified.")

    print("\nALL 15 INTEGRATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
