const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = 8000;
const STATIC_DIR = __dirname;
const DB_FILE = path.join(__dirname, 'data', 'statecraft_db.json');
const DEFAULT_DB_FILE = path.join(__dirname, 'data', 'default_states.json');
const MARKET_CONFIG_FILE = path.join(__dirname, 'data', 'market_config.json');

const DEFAULT_DEVELOPMENT_CATEGORIES = [
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
];

function getFormattedDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function ensureDbDefaults(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    data = {};
  }
  if (!Array.isArray(data.states)) data.states = [];
  if (!Array.isArray(data.teams)) data.teams = [];
  if (!data.adminConfig || typeof data.adminConfig !== 'object') {
    data.adminConfig = { adminPasscode: 'akshita' };
  } else if (!data.adminConfig.adminPasscode) {
    data.adminConfig.adminPasscode = 'akshita';
  }

  if (!data.buzzer || typeof data.buzzer !== 'object') {
    data.buzzer = {
      enabled: false,
      showResults: false,
      round: "Round 1: Rapid Response Buzzer",
      activatedAt: null,
      buzzes: []
    };
  } else {
    if (typeof data.buzzer.enabled !== 'boolean') data.buzzer.enabled = false;
    if (typeof data.buzzer.showResults !== 'boolean') data.buzzer.showResults = false;
    if (!data.buzzer.round) data.buzzer.round = "Round 1: Rapid Response Buzzer";
    if (data.buzzer.activatedAt === undefined) data.buzzer.activatedAt = null;
    if (!Array.isArray(data.buzzer.buzzes)) data.buzzer.buzzes = [];
  }

  if (!data.round2 || typeof data.round2 !== 'object') {
    data.round2 = {
      enabled: false,
      title: "Round 2: Mystery Policy Matrix",
      activatedAt: null,
      teamSelections: {}
    };
  } else {
    if (typeof data.round2.enabled !== 'boolean') data.round2.enabled = false;
    if (!data.round2.title) data.round2.title = "Round 2: Mystery Policy Matrix";
    if (data.round2.activatedAt === undefined) data.round2.activatedAt = null;
    if (!data.round2.teamSelections || typeof data.round2.teamSelections !== 'object') {
      data.round2.teamSelections = {};
    }
  }

  for (const team of data.teams) {
    if (team.points === undefined) team.points = 0;
    if (team.developmentScore === undefined) team.developmentScore = 0;
    if (!Array.isArray(team.purchasedInfrastructure)) team.purchasedInfrastructure = [];
    if (!team.categoryScores || typeof team.categoryScores !== 'object') {
      team.categoryScores = {};
    }
    for (const cat of DEFAULT_DEVELOPMENT_CATEGORIES) {
      if (team.categoryScores[cat] === undefined) {
        team.categoryScores[cat] = 0;
      }
    }
  }

  return data;
}

let _activeDbFile = null;
let _activeMarketFile = null;

function getActiveDbFile() {
  if (_activeDbFile) return _activeDbFile;
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const testFile = path.join(dir, '.write_test');
    fs.writeFileSync(testFile, '1');
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    _activeDbFile = DB_FILE;
    return _activeDbFile;
  } catch (e) {
    const tmpDb = path.join(os.tmpdir(), 'statecraft_db.json');
    if (!fs.existsSync(tmpDb)) {
      const source = fs.existsSync(DB_FILE) ? DB_FILE : DEFAULT_DB_FILE;
      if (source && fs.existsSync(source)) {
        try {
          fs.copyFileSync(source, tmpDb);
        } catch (err) {}
      }
    }
    _activeDbFile = tmpDb;
    return _activeDbFile;
  }
}

function getActiveMarketFile() {
  if (_activeMarketFile) return _activeMarketFile;
  try {
    const dir = path.dirname(MARKET_CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const testFile = path.join(dir, '.market_test');
    fs.writeFileSync(testFile, '1');
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    _activeMarketFile = MARKET_CONFIG_FILE;
    return _activeMarketFile;
  } catch (e) {
    const tmpMarket = path.join(os.tmpdir(), 'market_config.json');
    if (!fs.existsSync(tmpMarket) && fs.existsSync(MARKET_CONFIG_FILE)) {
      try {
        fs.copyFileSync(MARKET_CONFIG_FILE, tmpMarket);
      } catch (err) {}
    }
    _activeMarketFile = tmpMarket;
    return _activeMarketFile;
  }
}

function loadMarketConfig() {
  const target = getActiveMarketFile();
  if (fs.existsSync(target)) {
    try {
      const raw = fs.readFileSync(target, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('[Error loading market config]', err);
    }
  }
  if (fs.existsSync(MARKET_CONFIG_FILE)) {
    try {
      const raw = fs.readFileSync(MARKET_CONFIG_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {}
  }
  return [];
}

function loadDb() {
  const target = getActiveDbFile();
  try {
    if (!fs.existsSync(target)) {
      const source = fs.existsSync(DEFAULT_DB_FILE) ? DEFAULT_DB_FILE : DB_FILE;
      if (fs.existsSync(source)) {
        const raw = fs.readFileSync(source, 'utf-8');
        const data = ensureDbDefaults(JSON.parse(raw));
        try {
          fs.writeFileSync(target, JSON.stringify(data, null, 2), 'utf-8');
        } catch (e) {}
        return data;
      } else {
        return ensureDbDefaults({ states: [], teams: [], adminConfig: { adminPasscode: 'akshita' } });
      }
    }
    const raw = fs.readFileSync(target, 'utf-8');
    return ensureDbDefaults(JSON.parse(raw));
  } catch (e) {
    console.error('[Error loading DB]', e);
    if (fs.existsSync(DEFAULT_DB_FILE)) {
      try {
        const raw = fs.readFileSync(DEFAULT_DB_FILE, 'utf-8');
        return ensureDbDefaults(JSON.parse(raw));
      } catch (err) {}
    }
    return ensureDbDefaults({ states: [], teams: [], adminConfig: { adminPasscode: 'akshita' } });
  }
}

function saveDb(data) {
  const target = getActiveDbFile();
  try {
    if (!data.adminConfig) data.adminConfig = {};
    data.adminConfig.lastUpdated = getFormattedDate();
    fs.writeFileSync(target, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    try {
      const tmpTarget = path.join(os.tmpdir(), 'statecraft_db.json');
      fs.writeFileSync(tmpTarget, JSON.stringify(data, null, 2), 'utf-8');
    } catch (innerErr) {
      console.error('[Error saving DB to fallback]', innerErr);
    }
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4'
};

function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function serveStatic(req, res, pathname) {
  let relativePath = pathname === '/' || pathname === '' ? '/index.html' : pathname;
  if (relativePath === '/admin') relativePath = '/admin.html';
  if (relativePath === '/participant') relativePath = '/participant.html';

  // Prevent directory traversal
  const safePath = path.normalize(decodeURIComponent(relativePath)).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(STATIC_DIR, safePath);

  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname.replace(/\/+$/, '');
  if (pathname === '') pathname = '/';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end();
    return;
  }

  // API Routes
  if (pathname.startsWith('/api')) {
    // ----------------------------------------------------
    // GET Endpoints
    // ----------------------------------------------------
    if (req.method === 'GET') {
      const db = loadDb();

      if (pathname === '/api' || pathname === '/api/') {
        return sendJson(res, {
          status: "online",
          message: "StateCraft API is running",
          statesCount: (db.states || []).length,
          teamsCount: (db.teams || []).length,
          version: "1.0.0"
        });
      }

      if (pathname === '/api/status') {
        return sendJson(res, {
          status: "online",
          time: new Date().toISOString(),
          statesCount: (db.states || []).length,
          teamsCount: (db.teams || []).length,
          version: "1.0.0"
        });
      }

      if (pathname === '/api/data') {
        return sendJson(res, db);
      }

      if (pathname === '/api/states') {
        return sendJson(res, db.states || []);
      }

      if (pathname === '/api/teams') {
        return sendJson(res, db.teams || []);
      }

      if (pathname.startsWith('/api/teams/')) {
        const teamId = pathname.split('/').pop();
        const team = (db.teams || []).find(t => t.id === teamId);
        if (team) return sendJson(res, team);
        return sendJson(res, { error: "Team not found" }, 404);
      }

      if (pathname.startsWith('/api/states/')) {
        const stateId = pathname.split('/').pop();
        const state = (db.states || []).find(s => s.id === stateId);
        if (state) return sendJson(res, state);
        return sendJson(res, { error: "State not found" }, 404);
      }

      if (pathname === '/api/buzzer') {
        return sendJson(res, { success: true, buzzer: db.buzzer });
      }

      if (pathname === '/api/round2') {
        return sendJson(res, { success: true, round2: db.round2 });
      }

      if (pathname === '/api/market/config') {
        const items = loadMarketConfig();
        return sendJson(res, {
          success: true,
          items: items,
          categories: DEFAULT_DEVELOPMENT_CATEGORIES
        });
      }

      return sendJson(res, { error: "Endpoint not found" }, 404);
    }

    // ----------------------------------------------------
    // POST Endpoints
    // ----------------------------------------------------
    if (req.method === 'POST') {
      const body = await parseBody(req);
      const db = loadDb();

      // Admin Login
      if (pathname === '/api/admin/login') {
        const passcode = (body.passcode || '').trim();
        const correctCode = db.adminConfig?.adminPasscode || 'akshita';
        if (passcode === correctCode) {
          return sendJson(res, {
            success: true,
            message: "Admin authenticated successfully",
            adminToken: "adm_" + crypto.randomBytes(6).toString('hex')
          });
        }
        return sendJson(res, { success: false, error: "Invalid Admin Passcode" }, 401);
      }

      // Participant Login
      if (pathname === '/api/participant/login') {
        const teamName = (body.teamName || '').trim().toLowerCase();
        const password = (body.password || '').trim();

        const team = (db.teams || []).find(t => t.name.trim().toLowerCase() === teamName && t.password === password);
        if (!team) {
          return sendJson(res, { success: false, error: "Invalid Team Name or Password" }, 401);
        }

        let state = null;
        if (team.allocatedStateId) {
          state = (db.states || []).find(s => s.id === team.allocatedStateId) || null;
        }

        return sendJson(res, {
          success: true,
          team,
          allocatedState: state
        });
      }

      // Create Team
      if (pathname === '/api/teams') {
        const name = (body.name || '').trim();
        const password = (body.password || '').trim();
        const stateId = body.allocatedStateId || '';

        if (!name || !password) {
          return sendJson(res, { success: false, error: "Team Name and Password are required" }, 400);
        }

        if ((db.teams || []).some(t => t.name.trim().toLowerCase() === name.toLowerCase())) {
          return sendJson(res, { success: false, error: `A team named '${name}' already exists` }, 400);
        }

        if (stateId) {
          const allocatedBy = (db.teams || []).find(t => t.allocatedStateId === stateId);
          if (allocatedBy) {
            return sendJson(res, { success: false, error: `This state is already allocated to ${allocatedBy.name}` }, 400);
          }
        }

        const newTeam = {
          id: `team_${crypto.randomBytes(4).toString('hex')}`,
          name: name,
          password: password,
          allocatedStateId: stateId || null,
          points: 0,
          developmentScore: 0,
          categoryScores: DEFAULT_DEVELOPMENT_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {}),
          purchasedInfrastructure: [],
          pointLogs: [
            {
              id: `log_${crypto.randomBytes(3).toString('hex')}`,
              pointsChange: 0,
              category: "System Initialized",
              reason: "Team registered and initialized in the simulation.",
              timestamp: getFormattedDate()
            }
          ]
        };

        db.teams.push(newTeam);
        saveDb(db);
        return sendJson(res, { success: true, team: newTeam }, 201);
      }

      // Award / Modify Points
      if (pathname.startsWith('/api/teams/') && pathname.endsWith('/points')) {
        const parts = pathname.split('/');
        const teamId = parts[3];
        const team = (db.teams || []).find(t => t.id === teamId);
        if (!team) return sendJson(res, { success: false, error: "Team not found" }, 404);

        const change = parseInt(body.pointsChange, 10);
        if (isNaN(change)) {
          return sendJson(res, { success: false, error: "Invalid points value" }, 400);
        }

        const category = (body.category || '').trim() || "Round Evaluation";
        const reason = (body.reason || '').trim() || "Points awarded by Admin";

        team.points = Math.max(0, (team.points || 0) + change);
        if (!Array.isArray(team.pointLogs)) team.pointLogs = [];

        const logEntry = {
          id: `log_${crypto.randomBytes(3).toString('hex')}`,
          pointsChange: change,
          category: category,
          reason: reason,
          timestamp: getFormattedDate()
        };
        team.pointLogs.unshift(logEntry);

        saveDb(db);
        return sendJson(res, { success: true, team, addedLog: logEntry });
      }

      // Reset Database
      if (pathname === '/api/reset') {
        if (fs.existsSync(DEFAULT_DB_FILE)) {
          const raw = fs.readFileSync(DEFAULT_DB_FILE, 'utf-8');
          const defaultData = ensureDbDefaults(JSON.parse(raw));
          saveDb(defaultData);
          return sendJson(res, { success: true, message: "Database reset to initial defaults successfully" });
        }
        return sendJson(res, { success: false, error: "Default seed file not found" }, 500);
      }

      // Update Admin Config
      if (pathname === '/api/admin/config') {
        if (body.eventTitle) db.adminConfig.eventTitle = body.eventTitle;
        if (body.roundName) db.adminConfig.roundName = body.roundName;
        if (body.adminPasscode) db.adminConfig.adminPasscode = body.adminPasscode;
        saveDb(db);
        return sendJson(res, { success: true, adminConfig: db.adminConfig });
      }

      // Buzzer Toggle
      if (pathname === '/api/buzzer/toggle') {
        const enabled = Boolean(body.enabled);
        db.buzzer.enabled = enabled;
        db.buzzer.activatedAt = enabled ? new Date().toISOString() : null;
        saveDb(db);
        return sendJson(res, { success: true, buzzer: db.buzzer });
      }

      // Buzzer Reveal
      if (pathname === '/api/buzzer/reveal') {
        db.buzzer.showResults = Boolean(body.showResults);
        saveDb(db);
        return sendJson(res, { success: true, buzzer: db.buzzer });
      }

      // Buzzer Reset
      if (pathname === '/api/buzzer/reset') {
        const roundName = body.round || db.buzzer.round || "Round 1: Rapid Response Buzzer";
        db.buzzer = {
          enabled: false,
          showResults: false,
          round: roundName,
          activatedAt: null,
          buzzes: []
        };
        saveDb(db);
        return sendJson(res, { success: true, message: "Buzzer reset successfully", buzzer: db.buzzer });
      }

      // Buzzer Buzz
      if (pathname === '/api/buzzer/buzz') {
        if (!db.buzzer.enabled) {
          return sendJson(res, {
            success: false,
            error: "Buzzer is currently locked! Please wait for the admin to enable the buzzer."
          }, 400);
        }

        const teamId = (body.teamId || '').trim();
        if (!teamId) return sendJson(res, { success: false, error: "Team ID is required to buzz" }, 400);

        const team = (db.teams || []).find(t => t.id === teamId);
        if (!team) return sendJson(res, { success: false, error: "Team not recognized in database" }, 404);

        const existing = db.buzzer.buzzes.find(b => b.teamId === teamId);
        if (existing) {
          return sendJson(res, {
            success: false,
            error: `Your team has already pressed the buzzer! You are #${existing.order} in order.`,
            existingBuzz: existing,
            buzzer: db.buzzer
          }, 400);
        }

        const now = new Date();
        let elapsedMs = 0;
        if (db.buzzer.activatedAt) {
          const actDt = new Date(db.buzzer.activatedAt);
          elapsedMs = Math.max(0, now.getTime() - actDt.getTime());
        }

        let stateName = "Unallocated State";
        if (team.allocatedStateId) {
          const state = (db.states || []).find(s => s.id === team.allocatedStateId);
          if (state) stateName = state.name || stateName;
        }

        const pad = (n) => String(n).padStart(2, '0');
        const pad3 = (n) => String(n).padStart(3, '0');
        const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad3(now.getMilliseconds())}`;

        const orderNum = db.buzzer.buzzes.length + 1;
        const buzzRecord = {
          order: orderNum,
          teamId: team.id,
          teamName: team.name,
          stateName: stateName,
          timestamp: timeStr,
          elapsedMs: elapsedMs
        };

        db.buzzer.buzzes.push(buzzRecord);
        saveDb(db);
        return sendJson(res, {
          success: true,
          buzz: buzzRecord,
          order: orderNum,
          buzzer: db.buzzer
        });
      }

      // Round 2 Toggle
      if (pathname === '/api/round2/toggle') {
        const enabled = Boolean(body.enabled);
        db.round2.enabled = enabled;
        db.round2.activatedAt = enabled ? new Date().toISOString() : null;
        saveDb(db);
        return sendJson(res, { success: true, round2: db.round2 });
      }

      // Round 2 Reset
      if (pathname === '/api/round2/reset') {
        const targetTeamId = body.teamId;
        if (targetTeamId) {
          if (db.round2.teamSelections && db.round2.teamSelections[targetTeamId]) {
            delete db.round2.teamSelections[targetTeamId];
          }
        } else {
          db.round2.teamSelections = {};
          if (body.disable) {
            db.round2.enabled = false;
            db.round2.activatedAt = null;
          }
        }
        saveDb(db);
        return sendJson(res, { success: true, message: "Round 2 selections reset successfully", round2: db.round2 });
      }

      // Round 2 Submit
      if (pathname === '/api/round2/submit') {
        const isAdminCall = Boolean(body.fromAdmin);
        if (!isAdminCall && !db.round2.enabled) {
          return sendJson(res, {
            success: false,
            error: "Round 2 is currently locked by the administrator! Please wait for admin activation."
          }, 400);
        }

        const teamId = (body.teamId || '').trim();
        if (!teamId) return sendJson(res, { success: false, error: "Team ID is required to submit Round 2 selections" }, 400);

        const team = (db.teams || []).find(t => t.id === teamId);
        if (!team) return sendJson(res, { success: false, error: "Team not recognized in database" }, 404);

        const criteriaKey = (body.criteriaKey || '').trim();
        const criteriaTitle = body.criteriaTitle || (criteriaKey ? criteriaKey.charAt(0).toUpperCase() + criteriaKey.slice(1) : '');
        const chosenBoxes = Array.isArray(body.chosenBoxes) ? body.chosenBoxes : [];

        if (!criteriaKey || chosenBoxes.length < 1) {
          return sendJson(res, { success: false, error: "At least 1 policy box must be chosen." }, 400);
        }

        if (!isAdminCall && chosenBoxes.length !== 3) {
          return sendJson(res, { success: false, error: "Exactly 3 mystery boxes must be chosen for the selected criteria." }, 400);
        }

        if (!isAdminCall) {
          const hasDisadvantageous = chosenBoxes.some(b => ['disadvantageous', 'trade_off', 'external_sector'].includes(String(b.type || '').toLowerCase()));
          if (!hasDisadvantageous) {
            return sendJson(res, {
              success: false,
              error: "Strategic constraint violation: It is mandatory that at least 1 trade-off box is included in your package!"
            }, 400);
          }
        }

        const netTeamScore = chosenBoxes.reduce((acc, b) => acc + parseInt(b.teamPointsChange || 0, 10), 0);
        const criteriaImpacts = {};
        for (const b of chosenBoxes) {
          const targetCrit = b.targetCriterion || criteriaKey;
          const ptsChange = parseInt(b.criteriaPointsChange || 0, 10);
          criteriaImpacts[targetCrit] = (criteriaImpacts[targetCrit] || 0) + ptsChange;
        }

        let stateName = "Unallocated State";
        if (team.allocatedStateId) {
          const state = (db.states || []).find(s => s.id === team.allocatedStateId);
          if (state) stateName = state.name || stateName;
        }

        const selectionRecord = {
          teamId: team.id,
          teamName: team.name,
          allocatedStateId: team.allocatedStateId,
          stateName: stateName,
          criteriaKey: criteriaKey,
          criteriaTitle: criteriaTitle,
          chosenBoxes: chosenBoxes,
          netTeamScore: netTeamScore,
          criteriaImpacts: criteriaImpacts,
          submittedAt: getFormattedDate(),
          applied: false
        };

        if (!db.round2.teamSelections) db.round2.teamSelections = {};
        db.round2.teamSelections[team.id] = selectionRecord;
        saveDb(db);

        return sendJson(res, {
          success: true,
          selection: selectionRecord,
          round2: db.round2
        });
      }

      // Round 2 Apply
      if (pathname === '/api/round2/apply') {
        const teamId = (body.teamId || '').trim();
        if (!teamId) return sendJson(res, { success: false, error: "Team ID is required to apply Round 2 impacts" }, 400);

        const selection = db.round2?.teamSelections?.[teamId];
        if (!selection) return sendJson(res, { success: false, error: "No Round 2 submission found for this team" }, 404);

        const team = (db.teams || []).find(t => t.id === teamId);
        if (!team) return sendJson(res, { success: false, error: "Team not found" }, 404);

        const ptsChange = parseInt(selection.netTeamScore || 0, 10);
        team.points = Math.max(0, (team.points || 0) + ptsChange);

        if (!Array.isArray(team.pointLogs)) team.pointLogs = [];
        const critTitle = selection.criteriaTitle || "Sector";
        const logEntry = {
          id: `log_${crypto.randomBytes(3).toString('hex')}`,
          pointsChange: ptsChange,
          category: "Round 2: Policy Reform",
          reason: `Round 2 Mystery Box Package applied (${critTitle} reforms).`,
          timestamp: getFormattedDate()
        };
        team.pointLogs.unshift(logEntry);

        let state = null;
        if (team.allocatedStateId) {
          state = (db.states || []).find(s => s.id === team.allocatedStateId);
          if (state && state.criteria) {
            for (const [cKey, cChange] of Object.entries(selection.criteriaImpacts || {})) {
              if (state.criteria[cKey]) {
                const curPts = state.criteria[cKey].points ?? 50;
                state.criteria[cKey].points = Math.max(0, Math.min(100, curPts + parseInt(cChange, 10)));
              }
            }
          }
        }

        selection.applied = true;
        selection.appliedAt = getFormattedDate();
        saveDb(db);

        return sendJson(res, {
          success: true,
          message: `Successfully applied Round 2 policy impacts to ${team.name}`,
          selection,
          team,
          state
        });
      }

      // Market Buy
      if (pathname === '/api/market/buy') {
        const teamId = (body.teamId || '').trim();
        const itemId = (body.itemId || '').trim();
        const password = (body.password || '').trim();

        if (!teamId || !itemId) return sendJson(res, { success: false, error: "Team ID and Item ID are required" }, 400);

        const team = (db.teams || []).find(t => t.id === teamId);
        if (!team) return sendJson(res, { success: false, error: "Team not found" }, 404);

        if (team.password && team.password !== password) {
          return sendJson(res, { success: false, error: "Unauthorized: Invalid team credentials" }, 401);
        }

        const marketItems = loadMarketConfig();
        const item = marketItems.find(i => i.id === itemId);
        if (!item) return sendJson(res, { success: false, error: "Infrastructure item not found" }, 404);

        if (!Array.isArray(team.purchasedInfrastructure)) team.purchasedInfrastructure = [];
        if (!team.categoryScores || typeof team.categoryScores !== 'object') {
          team.categoryScores = DEFAULT_DEVELOPMENT_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {});
        }

        if (team.purchasedInfrastructure.some(p => p.id === itemId)) {
          return sendJson(res, {
            success: false,
            error: `'${item.name}' has already been purchased by your state.`
          }, 400);
        }

        const cost = parseInt(item.cost || 0, 10);
        const bonus = parseInt(item.bonus !== undefined ? item.bonus : cost, 10);
        const category = item.category || "Digital Development";

        const curPoints = parseInt(team.points || 0, 10);
        if (curPoints < cost) {
          return sendJson(res, { success: false, error: "Insufficient points to purchase this infrastructure." }, 400);
        }

        team.points = curPoints - cost;
        team.developmentScore = (parseInt(team.developmentScore || 0, 10)) + bonus;
        team.categoryScores[category] = (parseInt(team.categoryScores[category] || 0, 10)) + bonus;

        const purchaseRecord = {
          id: item.id,
          name: item.name,
          icon: item.icon || "🏗️",
          category: category,
          cost: cost,
          bonus: bonus,
          purchasedAt: getFormattedDate()
        };
        team.purchasedInfrastructure.push(purchaseRecord);

        const logEntry = {
          id: `log_${crypto.randomBytes(3).toString('hex')}`,
          pointsChange: -cost,
          category: `Infrastructure: ${category}`,
          reason: `Invested in ${item.name} (+${bonus} ${category} Dev Points)`,
          timestamp: getFormattedDate()
        };
        if (!Array.isArray(team.pointLogs)) team.pointLogs = [];
        team.pointLogs.unshift(logEntry);

        saveDb(db);
        return sendJson(res, {
          success: true,
          message: `${item.name} has been added to your state's infrastructure.`,
          purchase: purchaseRecord,
          team
        });
      }

      // Market Save Config
      if (pathname === '/api/market/config') {
        const newItems = body.items;
        if (!Array.isArray(newItems) || newItems.length === 0) {
          return sendJson(res, { success: false, error: "Invalid items configuration" }, 400);
        }
        try {
          fs.writeFileSync(MARKET_CONFIG_FILE, JSON.stringify(newItems, null, 2), 'utf-8');
          return sendJson(res, { success: true, message: "Market configuration saved successfully", items: newItems });
        } catch (err) {
          return sendJson(res, { success: false, error: `Failed to save market configuration: ${err.message}` }, 500);
        }
      }

      // Market Reset
      if (pathname === '/api/market/reset') {
        const teamId = (body.teamId || '').trim();
        const refund = Boolean(body.refundPoints);

        const resetTeam = (t) => {
          if (refund && Array.isArray(t.purchasedInfrastructure)) {
            const totalCost = t.purchasedInfrastructure.reduce((acc, p) => acc + parseInt(p.cost || 0, 10), 0);
            t.points = (parseInt(t.points || 0, 10)) + totalCost;
            if (totalCost > 0) {
              if (!Array.isArray(t.pointLogs)) t.pointLogs = [];
              t.pointLogs.unshift({
                id: `log_${crypto.randomBytes(3).toString('hex')}`,
                pointsChange: totalCost,
                category: "Market Reset Refund",
                reason: `Points refunded from infrastructure reset (+${totalCost} pts)`,
                timestamp: getFormattedDate()
              });
            }
          }
          t.purchasedInfrastructure = [];
          t.developmentScore = 0;
          t.categoryScores = DEFAULT_DEVELOPMENT_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {});
        };

        if (teamId) {
          const team = (db.teams || []).find(t => t.id === teamId);
          if (team) {
            resetTeam(team);
            saveDb(db);
            return sendJson(res, { success: true, message: `Market reset for team ${team.name}`, team });
          }
          return sendJson(res, { success: false, error: "Team not found" }, 404);
        } else {
          for (const t of (db.teams || [])) {
            resetTeam(t);
          }
          saveDb(db);
          return sendJson(res, { success: true, message: "Market reset for all teams" });
        }
      }

      return sendJson(res, { error: "Endpoint not found" }, 404);
    }

    // ----------------------------------------------------
    // PUT Endpoints
    // ----------------------------------------------------
    if (req.method === 'PUT') {
      const body = await parseBody(req);
      const db = loadDb();

      // Update Team
      if (pathname.startsWith('/api/teams/')) {
        const teamId = pathname.split('/').pop();
        const team = (db.teams || []).find(t => t.id === teamId);
        if (!team) return sendJson(res, { success: false, error: "Team not found" }, 404);

        const name = (body.name || '').trim();
        const password = (body.password || '').trim();
        const stateId = body.allocatedStateId;

        if (name) {
          if ((db.teams || []).some(t => t.name.trim().toLowerCase() === name.toLowerCase() && t.id !== teamId)) {
            return sendJson(res, { success: false, error: `A team named '${name}' already exists` }, 400);
          }
          team.name = name;
        }

        if (password) team.password = password;

        if (stateId !== undefined) {
          if (stateId !== "") {
            const takenBy = (db.teams || []).find(t => t.allocatedStateId === stateId && t.id !== teamId);
            if (takenBy) {
              return sendJson(res, { success: false, error: `This state is already allocated to ${takenBy.name}` }, 400);
            }
            team.allocatedStateId = stateId;
          } else {
            team.allocatedStateId = null;
          }
        }

        saveDb(db);
        return sendJson(res, { success: true, team });
      }

      // Update State Criteria
      if (pathname.startsWith('/api/states/')) {
        const stateId = pathname.split('/').pop();
        const state = (db.states || []).find(s => s.id === stateId);
        if (!state) return sendJson(res, { success: false, error: "State not found" }, 404);

        if (body.criteria && state.criteria) {
          for (const [ck, cv] of Object.entries(body.criteria)) {
            if (state.criteria[ck]) {
              Object.assign(state.criteria[ck], cv);
              if (state.criteria[ck].points !== undefined) {
                state.criteria[ck].points = parseInt(state.criteria[ck].points, 10) || 0;
              }
            }
          }
        }

        if (body.criteriaKey && state.criteria && state.criteria[body.criteriaKey]) {
          const ck = body.criteriaKey;
          if (body.value !== undefined) state.criteria[ck].value = body.value;
          if (body.subValue !== undefined) state.criteria[ck].subValue = body.subValue;
          if (body.responsibility !== undefined) state.criteria[ck].responsibility = body.responsibility;
          if (body.status !== undefined) state.criteria[ck].status = body.status;
          if (body.points !== undefined) state.criteria[ck].points = parseInt(body.points, 10) || 0;
        }

        let totalCriteriaPts = 0;
        for (const cv of Object.values(state.criteria || {})) {
          totalCriteriaPts += parseInt(cv.points || 0, 10);
        }

        saveDb(db);
        return sendJson(res, {
          success: true,
          state,
          totalCriteriaPoints: totalCriteriaPts
        });
      }

      return sendJson(res, { error: "Endpoint not found" }, 404);
    }

    // ----------------------------------------------------
    // DELETE Endpoints
    // ----------------------------------------------------
    if (req.method === 'DELETE') {
      const db = loadDb();
      if (pathname.startsWith('/api/teams/')) {
        const teamId = pathname.split('/').pop();
        const initialCount = (db.teams || []).length;
        db.teams = (db.teams || []).filter(t => t.id !== teamId);

        if (db.teams.length === initialCount) {
          return sendJson(res, { success: false, error: "Team not found" }, 404);
        }

        saveDb(db);
        return sendJson(res, { success: true, message: `Team ${teamId} deleted and state allocation released.` });
      }

      return sendJson(res, { error: "Endpoint not found" }, 404);
    }
  }

  // Static files fallback
  if (req.method === 'GET' || req.method === 'HEAD') {
    return serveStatic(req, res, pathname);
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
});

function startServer(port = PORT, attempt = 0) {
  if (attempt >= 10) {
    console.error('Failed to bind to an open port.');
    process.exit(1);
  }

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying port ${port + 1}...`);
      startServer(port + 1, attempt + 1);
    } else {
      console.error(err);
    }
  });

  server.listen(port, () => {
    console.log(`==================================================`);
    console.log(`  STATECRAFT SERVER RUNNING`);
    console.log(`  Main Gateway:       http://localhost:${port}/`);
    console.log(`  Admin Portal:       http://localhost:${port}/admin.html`);
    console.log(`  Participant Portal: http://localhost:${port}/participant.html`);
    console.log(`==================================================`);
  });
}

const args = process.argv.slice(2);
let targetPort = PORT;
if (args.length > 0 && !isNaN(parseInt(args[0], 10))) {
  targetPort = parseInt(args[0], 10);
}

startServer(targetPort);
