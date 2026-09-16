/**
 * StateCraft - Participant Portal Logic
 */

let loggedInTeam = null;
let currentAllocatedState = null;
let lastKnownPoints = null;
let lastKnownCriteriaHash = null;
let participantBuzzerState = { enabled: false, showResults: false, round: 'Round 1', buzzes: [] };
let hasBuzzed = false;
let myBuzzRecord = null;
let lastKnownBuzzerEnabled = false;
let lastKnownShowResults = false;

// Infrastructure Market State
let marketConfig = { items: [], categories: [] };
let selectedMarketItem = null;
let currentMarketCategoryFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  // Load market configuration
  await loadMarketConfigData();

  // Check if already logged in via sessionStorage
  const savedSession = sessionStorage.getItem('statecraft_participant_session');
  if (savedSession) {
    try {
      const sessionData = JSON.parse(savedSession);
      await loadParticipantDashboard(sessionData.teamName, sessionData.password, false);
    } catch (e) {
      sessionStorage.removeItem('statecraft_participant_session');
      showLoginView();
    }
  } else {
    showLoginView();
    renderDemoTeamPills();
  }

  // Setup BroadcastChannel live sync
  if (window.stateCraftChannel) {
    window.stateCraftChannel.onmessage = (e) => {
      console.log('[Participant Sync Event]', e.data);
      if (e.data && e.data.action && e.data.action.startsWith('BUZZER_')) {
        if (loggedInTeam) {
          refreshParticipantBuzzerState(true);
        }
      } else if (e.data && (e.data.action === 'INFRASTRUCTURE_PURCHASED' || e.data.action === 'MARKET_RESET' || e.data.action === 'MARKET_CONFIG_UPDATED')) {
        if (loggedInTeam) {
          syncParticipantData(false);
          loadMarketConfigData(true);
        }
      } else if (loggedInTeam) {
        syncParticipantData(false);
      }
    };
  }

  // Setup background polling (every 2.5 seconds) for general points/criteria sync
  setInterval(() => {
    if (loggedInTeam) {
      syncParticipantData(false);
    }
  }, 2500);

  // Fast polling (every 850ms) for buzzer state and real-time order reveal
  setInterval(() => {
    if (loggedInTeam) {
      refreshParticipantBuzzerState(false);
    }
  }, 850);

  // Spacebar shortcut for lightning-fast buzzing
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.key === ' ') {
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (loggedInTeam && participantBuzzerState && participantBuzzerState.enabled && !hasBuzzed) {
        e.preventDefault();
        handleParticipantBuzzPress();
      }
    }
  });

  // Initialize participant portal tabs
  setupParticipantTabs();
});

function setupParticipantTabs() {
  // Check URL hash if user navigated directly with #round1-buzzer-session or #section-state-criteria
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) {
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }
}

function scrollToBuzzerSession() {
  const el = document.getElementById('round1-buzzer-session');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function showLoginView() {
  document.getElementById('participant-login-view').style.display = 'flex';
  document.getElementById('participant-dashboard-view').style.display = 'none';
}

function showDashboardView() {
  document.getElementById('participant-login-view').style.display = 'none';
  document.getElementById('participant-dashboard-view').style.display = 'block';
}

// Quick login demo pills for ease of demonstration
async function renderDemoTeamPills() {
  const container = document.getElementById('demo-team-chips');
  if (!container) return;

  try {
    const data = await StateCraftAPI.fetchAllData();
    const teams = data.teams || [];
    if (teams.length > 0) {
      container.innerHTML = `
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.5rem;">Quick Select Sample Team:</div>
        <div class="flex items-center gap-2" style="flex-wrap: wrap;">
          ${teams.slice(0, 3).map(t => `
            <button class="btn btn-secondary btn-sm" onclick="quickFillCredentials('${escapeHtml(t.name)}', '${escapeHtml(t.password)}')">
              ${escapeHtml(t.name)}
            </button>
          `).join('')}
        </div>
      `;
    }
  } catch (e) {
    console.warn('Could not fetch teams for demo chips:', e);
  }
}

function quickFillCredentials(teamName, password) {
  document.getElementById('login-team-name').value = teamName;
  document.getElementById('login-password').value = password;
}

// Login Handler
async function handleParticipantLogin(e) {
  if (e) e.preventDefault();
  const teamNameInput = document.getElementById('login-team-name');
  const passwordInput = document.getElementById('login-password');
  const errorEl = document.getElementById('login-error-msg');

  const teamName = teamNameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!teamName || !password) {
    errorEl.textContent = 'Please enter both Team Name and Password.';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display = 'none';
  const loginBtn = document.getElementById('btn-participant-login');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Authenticating...';

  try {
    const res = await StateCraftAPI.participantLogin(teamName, password);
    if (res.success) {
      sessionStorage.setItem('statecraft_participant_session', JSON.stringify({ teamName, password }));
      loggedInTeam = res.team;
      currentAllocatedState = res.allocatedState;
      lastKnownPoints = res.team.points;
      lastKnownCriteriaHash = hashState(res.allocatedState);

      showDashboardView();
      renderDashboard();
      showToast(`Welcome, ${loggedInTeam.name}!`, 'success');
    } else {
      errorEl.textContent = res.error || 'Invalid credentials. Please verify your team name and password.';
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.textContent = 'Could not connect to server. Ensure StateCraft server is running.';
    errorEl.style.display = 'block';
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Enter Team Portal →';
  }
}

async function loadParticipantDashboard(teamName, password, showToastMessage = false) {
  try {
    const res = await StateCraftAPI.participantLogin(teamName, password);
    if (res.success) {
      loggedInTeam = res.team;
      currentAllocatedState = res.allocatedState;
      lastKnownPoints = res.team.points;
      lastKnownCriteriaHash = hashState(res.allocatedState);

      showDashboardView();
      renderDashboard();
      if (showToastMessage) showToast(`Session resumed for ${loggedInTeam.name}`, 'info');
    } else {
      sessionStorage.removeItem('statecraft_participant_session');
      showLoginView();
    }
  } catch (err) {
    sessionStorage.removeItem('statecraft_participant_session');
    showLoginView();
  }
}

// Background sync to fetch any changes made by Admin
async function syncParticipantData(silent = true) {
  if (!loggedInTeam) return;

  try {
    const fullData = await StateCraftAPI.fetchAllData();
    const updatedTeam = (fullData.teams || []).find(t => t.id === loggedInTeam.id);

    if (!updatedTeam) {
      // Team might have been removed by admin
      showToast('Your team profile was removed by Admin.', 'error');
      handleParticipantLogout();
      return;
    }

    const previousPoints = loggedInTeam.points;
    const previousAllocatedStateId = loggedInTeam.allocatedStateId;
    loggedInTeam = updatedTeam;

    // Check allocated state
    let updatedState = null;
    if (loggedInTeam.allocatedStateId) {
      updatedState = (fullData.states || []).find(s => s.id === loggedInTeam.allocatedStateId);
    }
    const previousState = currentAllocatedState;
    currentAllocatedState = updatedState;

    // Check if points changed
    if (previousPoints !== updatedTeam.points) {
      const diff = updatedTeam.points - previousPoints;
      const latestLog = updatedTeam.pointLogs && updatedTeam.pointLogs[0];
      const categoryMsg = latestLog && latestLog.category ? ` [${latestLog.category}]` : '';
      const reasonMsg = latestLog && latestLog.reason ? ` (${latestLog.reason})` : '';
      showToast(
        `🏆 Points Updated by Admin: ${diff > 0 ? '+' : ''}${diff} pts${categoryMsg}${reasonMsg}`, 
        diff > 0 ? 'success' : 'info'
      );
      renderPointsSection();
      renderPointLogs();
      triggerPointsFlash();
    }

    // Check if allocated state was changed by Admin
    if (previousAllocatedStateId !== loggedInTeam.allocatedStateId) {
      showToast(`🏛️ State Allocation Changed by Admin: ${updatedState ? updatedState.name : 'Unallocated'}`, 'info');
      renderDashboard();
      return;
    }

    // Check if criteria values in current state were modified by Admin
    const newCriteriaHash = hashState(updatedState);
    if (newCriteriaHash !== lastKnownCriteriaHash) {
      lastKnownCriteriaHash = newCriteriaHash;
      showToast(`📊 Admin updated criteria particulars for ${updatedState.name}`, 'info');
      renderHeroHeader();
      renderCriteriaGrid();
    }

  } catch (e) {
    // Silent sync error
    console.debug('Participant sync poll failed:', e);
  }
}

function hashState(state) {
  if (!state || !state.criteria) return '';
  return JSON.stringify(state.criteria);
}

function triggerPointsFlash() {
  const el = document.getElementById('team-live-points-display');
  if (el) {
    el.style.transform = 'scale(1.25)';
    el.style.color = '#10B981';
    el.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    setTimeout(() => {
      el.style.transform = 'scale(1)';
      el.style.color = '#FFFFFF';
    }, 400);
  }
}

// Render Dashboard
function renderDashboard() {
  renderHeroHeader();
  renderPointsSection();
  renderCriteriaGrid();
  renderPointLogs();
  renderMarketSection();
  refreshParticipantBuzzerState(false);
}

function renderHeroHeader() {
  document.getElementById('team-name-title').textContent = loggedInTeam.name;

  const stateBox = document.getElementById('allocated-state-display-box');
  const emblemCircle = document.getElementById('state-emblem-badge');

  if (currentAllocatedState) {
    const criteriaSum = calculateStateTotalCriteriaPoints(currentAllocatedState);
    stateBox.innerHTML = `
      <div class="allocated-state-tag flex items-center gap-2">
        <span>🏛️ Allocated State:</span>
        <strong style="color: #60A5FA; font-size: 1.25rem;">${escapeHtml(currentAllocatedState.name)}</strong>
        <span class="badge badge-gold" style="font-size: 0.8rem; font-weight: 800; padding: 0.15rem 0.55rem;">
          Total Criteria Points: ${criteriaSum} pts
        </span>
      </div>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">
        Capital: <strong style="color: #CBD5E1;">${escapeHtml(currentAllocatedState.capital)}</strong> • 
        Region: <strong style="color: #CBD5E1;">${escapeHtml(currentAllocatedState.region)}</strong>
      </div>
    `;

    // Emblem letters
    const initials = currentAllocatedState.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    emblemCircle.textContent = initials;
    emblemCircle.style.background = `linear-gradient(135deg, ${currentAllocatedState.color || '#4F46E5'}, #06B6D4)`;
  } else {
    stateBox.innerHTML = `
      <div class="allocated-state-tag" style="color: #F87171;">
        ⚠️ No State Allocated Yet by Admin
      </div>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">
        Please wait for the simulation administrator to assign a state to your team.
      </div>
    `;
    emblemCircle.textContent = '⏳';
    emblemCircle.style.background = 'rgba(148, 163, 184, 0.2)';
  }
}

function renderPointsSection() {
  const pointsValEl = document.getElementById('team-live-points-display');
  const devScoreEl = document.getElementById('team-dev-score-display');
  const assetsCountEl = document.getElementById('team-assets-count-display');

  if (loggedInTeam) {
    const points = (loggedInTeam.points !== undefined && loggedInTeam.points !== null) ? loggedInTeam.points : 0;
    const devScore = loggedInTeam.developmentScore || 0;
    const purchased = loggedInTeam.purchasedInfrastructure || [];

    if (pointsValEl) pointsValEl.textContent = points.toLocaleString();
    if (devScoreEl) devScoreEl.textContent = devScore.toLocaleString();
    if (assetsCountEl) assetsCountEl.textContent = `${purchased.length} Asset${purchased.length === 1 ? '' : 's'} Commissioned`;
  }
}

// Render 8 Criteria in Read-Only Mode
function renderCriteriaGrid() {
  const container = document.getElementById('criteria-cards-container');
  const alertNoState = document.getElementById('no-state-alert');

  if (!currentAllocatedState) {
    container.innerHTML = '';
    alertNoState.style.display = 'block';
    return;
  }

  alertNoState.style.display = 'none';
  const c = currentAllocatedState.criteria || {};
  const criteriaKeys = Object.keys(CRITERIA_METADATA);

  container.innerHTML = criteriaKeys.map(key => {
    const meta = CRITERIA_METADATA[key];
    const crit = c[key] || {
      value: 'Not Set',
      metric: 'Baseline Metric',
      subValue: '',
      responsibility: 'Responsibility details to be assigned by administrator.',
      status: 'Moderate'
    };
    const pts = getCriterionPoints(key, crit);

    return `
      <div class="criterion-card">
        <div>
          <div class="criterion-header">
            <div class="criterion-title-wrap">
              <div class="criterion-icon icon-${key}">
                ${meta.icon}
              </div>
              <div>
                <div class="flex items-center gap-2" style="flex-wrap: wrap;">
                  <h4 class="criterion-name">${meta.title}</h4>
                  <span class="badge badge-gold" style="font-size: 0.8rem; font-weight: 800; padding: 0.15rem 0.55rem; letter-spacing: 0.02em;">
                    ⭐ ${pts} pts
                  </span>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">${escapeHtml(crit.metric || 'Key Metric')}</div>
              </div>
            </div>
            ${getStatusBadge(crit.status)}
          </div>

          <div class="criterion-main-value">
            ${escapeHtml(crit.value)}
          </div>

          <div class="criterion-subvalue">
            ${escapeHtml(crit.subValue || '—')}
          </div>

          <div class="criterion-responsibility">
            <div style="font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: #94A3B8; margin-bottom: 0.3rem;">
              Function & Strategic Responsibility:
            </div>
            ${escapeHtml(crit.responsibility || 'No responsibility configured.')}
          </div>
        </div>

        <div class="criterion-footer">
          <span class="locked-indicator">
            🔒 Official Baseline • Read-Only
          </span>
          <span style="font-size: 0.75rem; color: #64748B;">
            Managed by Admin
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// Point Logs Ledger
function renderPointLogs() {
  const container = document.getElementById('participant-point-logs-container');
  if (!container) return;

  const logs = loggedInTeam.pointLogs || [];
  if (logs.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No point evaluations recorded yet.</p>';
    return;
  }

  container.innerHTML = logs.map(log => {
    const isPos = log.pointsChange > 0;
    const isNeg = log.pointsChange < 0;
    const tagClass = isPos ? 'positive' : (isNeg ? 'negative' : 'zero');
    const sign = isPos ? '+' : '';

    return `
      <div class="point-log-item">
        <div>
          <div class="flex items-center gap-2" style="margin-bottom: 0.35rem;">
            <span class="badge badge-indigo">${escapeHtml(log.category || 'Evaluation')}</span>
            <span style="font-size: 0.78rem; color: var(--text-muted); font-family: var(--font-mono);">${log.timestamp || ''}</span>
          </div>
          <p style="font-size: 0.92rem; color: var(--text-primary); margin: 0; font-weight: 500;">
            ${escapeHtml(log.reason || 'Points awarded by administrator')}
          </p>
        </div>
        <div class="log-points-tag ${tagClass}">
          ${sign}${log.pointsChange}
        </div>
      </div>
    `;
  }).join('');
}

function handleParticipantLogout() {
  sessionStorage.removeItem('statecraft_participant_session');
  loggedInTeam = null;
  currentAllocatedState = null;
  hasBuzzed = false;
  myBuzzRecord = null;
  showLoginView();
  showToast('Logged out successfully', 'info');
}

/* ==========================================================================
   INFRASTRUCTURE INVESTMENT MARKETPLACE LOGIC (INDIA 2050)
   ========================================================================== */

const CATEGORY_ICONS = {
  "Education": "🏫",
  "Healthcare": "🏥",
  "Transport & Infrastructure": "🛣️",
  "Water & Sanitation": "💧",
  "Energy": "⚡",
  "Agriculture": "🌾",
  "Industry & Economy": "🏭",
  "Environment": "♻️",
  "Disaster Management": "🌊",
  "Housing & Social Development": "🏠",
  "Digital Development": "🏙️"
};

async function loadMarketConfigData(forceRerender = false) {
  try {
    const res = await StateCraftAPI.fetchMarketConfig();
    if (res && res.items && res.items.length > 0) {
      marketConfig = res;
      if (forceRerender && loggedInTeam) {
        renderMarketSection();
      }
    }
  } catch (err) {
    console.warn('Could not load market configuration:', err);
  }
}

function renderMarketSection() {
  if (!loggedInTeam) return;

  renderMarketBalanceBar();
  renderMarketCategoryChips();
  renderPurchasedInfrastructure();
  renderMarketCardsGrid();
}

function renderMarketBalanceBar() {
  const availEl = document.getElementById('market-available-points');
  const devEl = document.getElementById('market-dev-score');
  const countEl = document.getElementById('market-assets-count');
  const navBadge = document.getElementById('participant-nav-market-badge');
  const purchasedBadge = document.getElementById('purchased-counter-badge');

  const points = (loggedInTeam.points !== undefined && loggedInTeam.points !== null) ? loggedInTeam.points : 0;
  const devScore = loggedInTeam.developmentScore || 0;
  const purchased = loggedInTeam.purchasedInfrastructure || [];
  const totalItems = marketConfig.items.length || 20;
  const remainingCount = Math.max(0, totalItems - purchased.length);

  if (availEl) availEl.textContent = points.toLocaleString();
  if (devEl) devEl.textContent = devScore.toLocaleString();
  if (countEl) countEl.textContent = `${purchased.length} / ${totalItems}`;
  if (navBadge) navBadge.textContent = `${remainingCount} Available`;
  if (purchasedBadge) purchasedBadge.textContent = `${purchased.length} Asset${purchased.length === 1 ? '' : 's'} Built`;
}

function renderMarketCategoryChips() {
  const container = document.getElementById('market-category-chips-container');
  if (!container) return;

  const categories = (marketConfig.categories && marketConfig.categories.length > 0)
    ? marketConfig.categories
    : [
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

  const categoryScores = loggedInTeam.categoryScores || {};

  container.innerHTML = categories.map(cat => {
    const score = categoryScores[cat] || 0;
    const icon = CATEGORY_ICONS[cat] || '📊';
    const hasBonus = score > 0;

    return `
      <div class="category-chip ${hasBonus ? 'has-bonus' : ''}" title="${escapeHtml(cat)} Sector Development">
        <span class="chip-icon">${icon}</span>
        <span class="chip-name">${escapeHtml(cat)}</span>
        <span class="chip-score ${hasBonus ? 'score-active' : ''}">${hasBonus ? '+' : ''}${score}</span>
      </div>
    `;
  }).join('');
}

function renderPurchasedInfrastructure() {
  const container = document.getElementById('purchased-infrastructure-container');
  if (!container) return;

  const purchased = loggedInTeam.purchasedInfrastructure || [];

  if (purchased.length === 0) {
    container.innerHTML = `
      <div class="card empty-purchased-banner">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🏗️</div>
        <h4 style="color: #CBD5E1; margin-bottom: 0.35rem;">No Infrastructure Commissioned Yet</h4>
        <p style="font-size: 0.88rem; color: var(--text-muted); max-width: 540px; margin: 0 auto;">
          Your state has not yet spent points to build public infrastructure. Browse the 20 available infrastructure options below and click "BUY" to invest your points.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="purchased-assets-grid">
      ${purchased.map(item => `
        <div class="purchased-asset-card fade-in">
          <div class="asset-card-top">
            <div class="asset-icon">${item.icon || '🏗️'}</div>
            <span class="badge badge-emerald" style="font-size: 0.72rem; font-weight: 800;">✓ COMMISSIONED</span>
          </div>
          <h4 class="asset-name">${escapeHtml(item.name)}</h4>
          <div class="asset-category-pill">
            <span>${CATEGORY_ICONS[item.category] || '🏷️'}</span>
            <span>${escapeHtml(item.category)}</span>
          </div>
          <div class="asset-metrics-row">
            <div class="metric-col">
              <span class="metric-label">Invested Cost</span>
              <span class="metric-val text-cost">💎 ${item.cost} pts</span>
            </div>
            <div class="metric-col">
              <span class="metric-label">Dev Gain</span>
              <span class="metric-val text-gain">📈 +${item.bonus} pts</span>
            </div>
          </div>
          <div class="asset-timestamp">
            <span>🕒 Commissioned: ${escapeHtml(item.purchasedAt || 'Earlier')}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderMarketCardsGrid() {
  const grid = document.getElementById('market-cards-grid');
  if (!grid) return;

  const items = marketConfig.items || [];
  if (items.length === 0) {
    grid.innerHTML = '<p style="text-align: center; color: var(--text-muted); grid-column: 1/-1; padding: 2rem;">Loading infrastructure marketplace...</p>';
    return;
  }

  const purchasedList = loggedInTeam.purchasedInfrastructure || [];
  const purchasedIds = new Set(purchasedList.map(p => p.id));
  const curPoints = (loggedInTeam.points !== undefined && loggedInTeam.points !== null) ? loggedInTeam.points : 0;

  // Filter items
  const filtered = items.filter(item => {
    if (currentMarketCategoryFilter === 'all') return true;
    return item.category === currentMarketCategoryFilter;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="text-align: center; color: var(--text-muted); grid-column: 1/-1; padding: 2rem;">No infrastructure items in this category.</p>';
    return;
  }

  grid.innerHTML = filtered.map((item, idx) => {
    const isPurchased = purchasedIds.has(item.id);
    const canAfford = curPoints >= item.cost;
    const catIcon = CATEGORY_ICONS[item.category] || '🏷️';

    let actionBtnHtml = '';
    if (isPurchased) {
      actionBtnHtml = `
        <button class="btn btn-card-action btn-purchased" disabled title="Already purchased by your state">
          <span>✓ PURCHASED</span>
        </button>
      `;
    } else if (canAfford) {
      actionBtnHtml = `
        <button class="btn btn-card-action btn-buy-active" onclick="openPurchaseModal('${item.id}')" title="Invest ${item.cost} points in ${escapeHtml(item.name)}">
          <span>BUY — ${item.cost} PTS</span>
          <span style="font-size: 1rem;">→</span>
        </button>
      `;
    } else {
      actionBtnHtml = `
        <button class="btn btn-card-action btn-buy-insufficient" onclick="handleInsufficientPoints('${item.id}')" title="Requires ${item.cost} points. Current available: ${curPoints} points.">
          <span>BUY — ${item.cost} PTS</span>
        </button>
      `;
    }

    return `
      <div class="market-card ${isPurchased ? 'card-purchased' : (canAfford ? 'card-affordable' : 'card-locked')} fade-in" id="market-card-${item.id}" style="--card-index: ${idx};">
        <!-- Floating Header -->
        <div class="market-card-header">
          <div class="market-card-category">
            <span>${catIcon}</span>
            <span>${escapeHtml(item.category)}</span>
          </div>
          ${isPurchased ? '<span class="status-badge-purchased">✓ OWNED</span>' : ''}
        </div>

        <!-- Large Icon and Title -->
        <div class="market-card-hero">
          <div class="market-card-icon">${item.icon || '🏗️'}</div>
          <h3 class="market-card-name">${escapeHtml(item.name)}</h3>
        </div>

        <p class="market-card-desc">
          ${escapeHtml(item.description || 'Strategic civic infrastructure investment for state growth.')}
        </p>

        <!-- Stats Bar -->
        <div class="market-card-stats">
          <div class="stat-box cost-box">
            <span class="stat-box-label">Investment Cost</span>
            <span class="stat-box-val text-cost">💎 ${item.cost} pts</span>
          </div>
          <div class="stat-box bonus-box">
            <span class="stat-box-label">Development Gain</span>
            <span class="stat-box-val text-gain">📈 +${item.bonus} pts</span>
          </div>
        </div>

        <!-- Action Button -->
        <div class="market-card-action">
          ${actionBtnHtml}
        </div>
      </div>
    `;
  }).join('');
}

function filterMarketCategory(category) {
  currentMarketCategoryFilter = category;

  // Update pills UI
  const pills = document.querySelectorAll('#market-filter-pills .filter-pill');
  pills.forEach(pill => {
    const text = pill.textContent.trim().toLowerCase();
    const catLower = category.toLowerCase();
    if (category === 'all' && text.startsWith('all')) {
      pill.classList.add('active');
    } else if (text.includes(catLower.slice(0, 5))) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });

  renderMarketCardsGrid();
}

function openPurchaseModal(itemId) {
  const item = (marketConfig.items || []).find(i => i.id === itemId);
  if (!item || !loggedInTeam) return;

  selectedMarketItem = item;

  const curPoints = (loggedInTeam.points !== undefined && loggedInTeam.points !== null) ? loggedInTeam.points : 0;
  const cost = item.cost;
  const afterPoints = curPoints - cost;
  const bonus = item.bonus;
  const canAfford = curPoints >= cost;

  // Populate fields
  document.getElementById('modal-buy-icon').textContent = item.icon || '🏗️';
  document.getElementById('modal-item-name').textContent = item.name;
  document.getElementById('modal-item-category').textContent = item.category;
  document.getElementById('modal-item-cost').textContent = `${cost} points`;
  document.getElementById('modal-current-points').textContent = `${curPoints} points`;
  document.getElementById('modal-after-points').textContent = `${afterPoints >= 0 ? afterPoints : 0} points`;
  document.getElementById('modal-bonus-label').textContent = `${item.category} Development:`;
  document.getElementById('modal-item-bonus').textContent = `+${bonus} ${item.category} Points`;

  const errorEl = document.getElementById('modal-buy-error');
  const confirmBtn = document.getElementById('btn-confirm-investment');

  if (!canAfford) {
    errorEl.textContent = `⚠️ Insufficient points to purchase this infrastructure. (Requires ${cost} points, available: ${curPoints} points)`;
    errorEl.style.display = 'block';
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';
    confirmBtn.style.cursor = 'not-allowed';
  } else {
    errorEl.style.display = 'none';
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
    confirmBtn.textContent = '[CONFIRM PURCHASE]';
  }

  document.getElementById('modal-confirm-purchase').classList.add('active');
}

function closePurchaseModal() {
  const modal = document.getElementById('modal-confirm-purchase');
  if (modal) modal.classList.remove('active');
  selectedMarketItem = null;
}

async function executeInfrastructurePurchase() {
  if (!selectedMarketItem || !loggedInTeam) return;

  const item = selectedMarketItem;
  const confirmBtn = document.getElementById('btn-confirm-investment');
  const errorEl = document.getElementById('modal-buy-error');

  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Processing Investment...';

  try {
    const res = await StateCraftAPI.buyInfrastructure(loggedInTeam.id, loggedInTeam.password, item.id);

    if (res.success && res.team) {
      loggedInTeam = res.team;
      closePurchaseModal();

      // Play audio feedback
      playMarketSuccessSound();

      // Populate & open success modal
      document.getElementById('success-modal-icon').textContent = item.icon || '🏛️';
      document.getElementById('success-modal-title').textContent = `${item.name} Commissioned!`;
      document.getElementById('success-modal-desc').textContent = `${item.name} has been added to your state's infrastructure.`;
      document.getElementById('success-cost-deducted').textContent = `-${item.cost} pts`;
      document.getElementById('success-bonus-added').textContent = `+${item.bonus} ${item.category} pts`;
      document.getElementById('success-new-balance').textContent = `${loggedInTeam.points} pts`;

      document.getElementById('modal-purchase-success').classList.add('active');

      // Update UI immediately
      renderDashboard();
      triggerPointsFlash();
      showToast(`INVESTMENT SUCCESSFUL: ${item.name} added to your state's infrastructure.`, 'success', 5000);
    } else {
      playMarketErrorSound();
      errorEl.textContent = res.error || 'Insufficient points to purchase this infrastructure.';
      errorEl.style.display = 'block';
      confirmBtn.disabled = false;
      confirmBtn.textContent = '[CONFIRM PURCHASE]';
    }
  } catch (err) {
    playMarketErrorSound();
    errorEl.textContent = 'Network or server communication error. Please try again.';
    errorEl.style.display = 'block';
    confirmBtn.disabled = false;
    confirmBtn.textContent = '[CONFIRM PURCHASE]';
  }
}

function closeSuccessModal() {
  const modal = document.getElementById('modal-purchase-success');
  if (modal) modal.classList.remove('active');
}

function handleInsufficientPoints(itemId) {
  const item = (marketConfig.items || []).find(i => i.id === itemId);
  const curPoints = (loggedInTeam && loggedInTeam.points !== undefined) ? loggedInTeam.points : 0;
  const cost = item ? item.cost : 'required';

  playMarketErrorSound();
  showToast(`Insufficient points to purchase this infrastructure. Required: ${cost} pts, Available: ${curPoints} pts.`, 'error', 4500);
}

/* ==========================================================================
   ROUND 1 RAPID RESPONSE BUZZER LOGIC (PARTICIPANT)
   ========================================================================== */

async function refreshParticipantBuzzerState(fromBroadcast = false) {
  if (!loggedInTeam) return;

  try {
    const b = await StateCraftAPI.fetchBuzzerState();
    const prevEnabled = lastKnownBuzzerEnabled;
    const prevShow = lastKnownShowResults;

    participantBuzzerState = b;
    lastKnownBuzzerEnabled = Boolean(b.enabled);
    lastKnownShowResults = Boolean(b.showResults);

    // Check if my team has buzzed
    const myBuzz = (b.buzzes || []).find(x => x.teamId === loggedInTeam.id);
    if (myBuzz) {
      hasBuzzed = true;
      myBuzzRecord = myBuzz;
    } else {
      // If no buzz in queue (e.g., admin reset)
      hasBuzzed = false;
      myBuzzRecord = null;
    }

    // Audio cue, toast, and auto-scroll to Round 1 session if Admin unlocked buzzer just now
    if (!prevEnabled && b.enabled && !hasBuzzed) {
      if (typeof playBuzzerSound === 'function') playBuzzerSound('unlock');
      showToast('⚡ ROUND 1 BUZZER IS LIVE! Click the red buzzer below!', 'success', 4000);
      scrollToBuzzerSession();
    }

    // Audio cue and toast if Admin revealed standings
    if (!prevShow && b.showResults) {
      if (typeof playBuzzerSound === 'function') playBuzzerSound('reveal');
      showToast('🏆 Admin has displayed the official Buzzer Order below!', 'info');
    }

    renderParticipantBuzzerUI();
  } catch (err) {
    console.debug('Failed to sync participant buzzer:', err);
  }
}

function renderParticipantBuzzerUI() {
  const card = document.getElementById('participant-buzzer-card');
  const btn = document.getElementById('btn-participant-buzz');
  const icon = document.getElementById('buzzer-btn-icon');
  const label = document.getElementById('buzzer-btn-label');
  const sublabel = document.getElementById('buzzer-btn-sublabel');
  const statusBadge = document.getElementById('participant-buzzer-status-badge');
  const mainPrompt = document.getElementById('buzzer-main-prompt');
  const subPrompt = document.getElementById('buzzer-sub-prompt');
  const shortcutHint = document.getElementById('buzzer-shortcut-hint');
  const confirmBanner = document.getElementById('buzzer-confirmation-banner');
  const confirmText = document.getElementById('buzzer-confirmation-text');
  const confirmSubtext = document.getElementById('buzzer-confirmation-subtext');

  if (!card || !btn) return;

  const b = participantBuzzerState || { enabled: false, showResults: false, buzzes: [] };
  const isEnabled = Boolean(b.enabled);
  const showResults = Boolean(b.showResults);

  // Update participant navigation tab pill badge
  const navBadge = document.getElementById('participant-nav-buzzer-badge');
  if (navBadge) {
    if (hasBuzzed && myBuzzRecord) {
      navBadge.className = 'badge badge-emerald';
      navBadge.textContent = `RANK #${myBuzzRecord.order}`;
      navBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      navBadge.style.color = '#34D399';
    } else if (isEnabled) {
      navBadge.className = 'badge badge-rose';
      navBadge.textContent = 'OPEN 🔴';
      navBadge.style.background = 'rgba(244, 63, 94, 0.2)';
      navBadge.style.color = '#FDA4AF';
    } else {
      navBadge.className = 'badge badge-needs-attention';
      navBadge.textContent = 'LOCKED';
      navBadge.style.background = '';
      navBadge.style.color = '';
    }
  }

  if (hasBuzzed && myBuzzRecord) {
    // 1. Team has already buzzed!
    card.className = 'participant-buzzer-card buzzed-success';
    btn.className = 'buzzer-btn buzzer-buzzed';
    btn.disabled = true;

    if (icon) icon.textContent = '✓';
    if (label) label.textContent = `RANK #${myBuzzRecord.order}`;
    if (sublabel) sublabel.textContent = 'Buzz Recorded';

    if (statusBadge) {
      statusBadge.innerHTML = `
        <span class="status-pill-pulse status-pill-open" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.4); color: #34D399;">
          <span>✓</span>
          <span>Rank #${myBuzzRecord.order} Recorded</span>
        </span>
      `;
    }

    if (mainPrompt) mainPrompt.textContent = `🎉 Buzz Registered! You are #${myBuzzRecord.order} in Order!`;
    const elapsedFormatted = myBuzzRecord.elapsedMs !== undefined ? `+${(myBuzzRecord.elapsedMs / 1000).toFixed(2)}s reaction` : '';
    if (subPrompt) subPrompt.textContent = `Time: ${myBuzzRecord.timestamp || ''} ${elapsedFormatted ? '• ' + elapsedFormatted : ''}`;

    if (shortcutHint) shortcutHint.style.display = 'none';
    if (confirmBanner) confirmBanner.style.display = 'block';
    if (confirmText) confirmText.textContent = `Official Position: #${myBuzzRecord.order} in Sequence`;

    if (confirmSubtext) {
      if (!showResults) {
        confirmSubtext.textContent = '🔒 Standings are currently hidden by the administrator. Your arrival order has been recorded with the admin.';
      } else {
        confirmSubtext.textContent = '🏆 The administrator has published the full round standings! Check the official arrival order table below.';
      }
    }

  } else if (isEnabled) {
    // 2. Buzzer is ENABLED and waiting for participant to click
    card.className = 'participant-buzzer-card active-buzzer';
    btn.className = 'buzzer-btn buzzer-active';
    btn.disabled = false;

    if (icon) icon.textContent = '🚨';
    if (label) label.textContent = 'PRESS BUZZER!';
    if (sublabel) sublabel.textContent = 'Click or Spacebar';

    if (statusBadge) {
      statusBadge.innerHTML = `
        <div class="status-pill-pulse status-pill-open">
          <span class="pulse-dot-red"></span>
          <span>Buzzer Live</span>
        </div>
      `;
    }

    if (mainPrompt) mainPrompt.textContent = '🚨 Round 1 Buzzer is OPEN!';
    if (subPrompt) subPrompt.textContent = 'Press the big buzzer button or hit SPACEBAR immediately to claim your team\'s answer slot!';

    if (shortcutHint) shortcutHint.style.display = 'inline-flex';
    if (confirmBanner) confirmBanner.style.display = 'none';

  } else {
    // 3. Buzzer is LOCKED by Admin
    card.className = 'participant-buzzer-card';
    btn.className = 'buzzer-btn buzzer-locked';
    btn.disabled = true;

    if (icon) icon.textContent = '🔒';
    if (label) label.textContent = 'LOCKED';
    if (sublabel) sublabel.textContent = 'Waiting for Admin';

    if (statusBadge) {
      statusBadge.innerHTML = `
        <span class="status-pill-pulse status-pill-locked">
          <span>🔒</span>
          <span>Buzzer Locked</span>
        </span>
      `;
    }

    if (mainPrompt) mainPrompt.textContent = 'Awaiting Admin Activation';
    if (subPrompt) subPrompt.textContent = 'The buzzer is locked by the simulation administrator. When enabled for Round 1, this button will activate instantly!';

    if (shortcutHint) shortcutHint.style.display = 'none';
    if (confirmBanner) confirmBanner.style.display = 'none';
  }

  // Render Revealed Queue Table if Admin enabled Display Order
  renderParticipantRevealedQueue();
}

function renderParticipantRevealedQueue() {
  const card = document.getElementById('participant-revealed-order-card');
  const tbody = document.getElementById('participant-revealed-queue-body');
  if (!card || !tbody) return;

  const b = participantBuzzerState || { enabled: false, showResults: false, buzzes: [] };
  const showResults = Boolean(b.showResults);
  const buzzes = b.buzzes || [];

  if (!showResults || buzzes.length === 0) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';

  tbody.innerHTML = buzzes.map((buzz, idx) => {
    const rank = buzz.order || (idx + 1);
    const isMyTeam = loggedInTeam && buzz.teamId === loggedInTeam.id;

    let rankBadgeHtml = '';
    let rowClass = '';

    if (rank === 1) {
      rankBadgeHtml = `<span class="rank-badge rank-badge-1" title="1st Place">👑 1</span>`;
      rowClass = 'buzzer-row-rank-1';
    } else if (rank === 2) {
      rankBadgeHtml = `<span class="rank-badge rank-badge-2" title="2nd Place">🥈 2</span>`;
      rowClass = 'buzzer-row-rank-2';
    } else if (rank === 3) {
      rankBadgeHtml = `<span class="rank-badge rank-badge-3" title="3rd Place">🥉 3</span>`;
      rowClass = 'buzzer-row-rank-3';
    } else {
      rankBadgeHtml = `<span class="rank-badge rank-badge-other">#${rank}</span>`;
    }

    const elapsedStr = buzz.elapsedMs !== undefined ? `+${(buzz.elapsedMs / 1000).toFixed(2)}s` : '—';

    return `
      <tr class="${rowClass}" style="${isMyTeam ? 'background: rgba(99, 102, 241, 0.15) !important; font-weight: 700;' : ''}">
        <td>${rankBadgeHtml}</td>
        <td>
          <div class="flex items-center gap-2">
            <span style="color: var(--text-primary); font-size: 0.98rem; font-weight: ${isMyTeam ? '800' : '600'};">
              ${escapeHtml(buzz.teamName)}
            </span>
            ${isMyTeam ? '<span class="badge badge-emerald" style="font-size: 0.7rem; padding: 0.1rem 0.4rem;">Your Team</span>' : ''}
          </div>
        </td>
        <td>
          <span class="badge badge-indigo">
            🏛️ ${escapeHtml(buzz.stateName || 'Unallocated')}
          </span>
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-secondary);">
            ${escapeHtml(buzz.timestamp || '')}
          </span>
        </td>
        <td>
          <span class="reaction-tag">⚡ ${elapsedStr}</span>
        </td>
      </tr>
    `;
  }).join('');
}

async function handleParticipantBuzzPress() {
  if (!loggedInTeam) {
    showToast('Please log in first', 'error');
    return;
  }

  if (hasBuzzed) {
    showToast(`You have already buzzed! Position #${myBuzzRecord ? myBuzzRecord.order : ''}`, 'info');
    return;
  }

  if (!participantBuzzerState || !participantBuzzerState.enabled) {
    if (typeof playBuzzerSound === 'function') playBuzzerSound('error');
    showToast('Buzzer is currently locked! Please wait for Admin to activate it.', 'error');
    return;
  }

  // Instant tactile feedback
  const btn = document.getElementById('btn-participant-buzz');
  if (btn) {
    btn.classList.add('pressed-down');
    btn.disabled = true;
  }

  if (typeof playBuzzerSound === 'function') {
    playBuzzerSound('buzz');
  }

  try {
    const res = await StateCraftAPI.submitBuzz(loggedInTeam.id);
    if (res.success) {
      hasBuzzed = true;
      myBuzzRecord = res.buzz;
      participantBuzzerState = res.buzzer || participantBuzzerState;
      showToast(`🎉 Buzz Registered! You are #${res.order}!`, 'success');
      renderParticipantBuzzerUI();
    } else {
      if (res.existingBuzz) {
        hasBuzzed = true;
        myBuzzRecord = res.existingBuzz;
      }
      showToast(res.error || 'Could not register buzz', 'error');
      renderParticipantBuzzerUI();
    }
  } catch (err) {
    console.error('Buzz error:', err);
    showToast('Network error while buzzing. Retrying sync...', 'error');
    await refreshParticipantBuzzerState(false);
  }
}
