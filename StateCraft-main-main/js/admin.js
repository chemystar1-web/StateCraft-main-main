/**
 * StateCraft - Admin Portal Logic
 */

let stateCraftData = {
  states: [],
  teams: [],
  adminConfig: {}
};

let activeRegion = 'ALL';
let stateSearchQuery = '';
let currentlyEditingState = null;
let currentlyScoringTeam = null;
let currentBuzzerState = {
  enabled: false,
  showResults: false,
  round: 'Round 1: Rapid Response Buzzer',
  buzzes: []
};
let currentRound2State = {
  enabled: false,
  title: 'Round 2: Mystery Policy Matrix',
  teamSelections: {}
};
let activeInspectorCriteria = 'education';

document.addEventListener('DOMContentLoaded', async () => {
  // Check admin session
  const adminAuth = sessionStorage.getItem('statecraft_admin_auth');
  if (!adminAuth) {
    showAdminAuthModal();
  } else {
    document.getElementById('admin-content-wrapper').style.display = 'block';
    await initAdminPortal();
  }

  // Setup tabs
  setupNavigationTabs();
  // Setup BroadcastChannel sync listener
  if (window.stateCraftChannel) {
    window.stateCraftChannel.onmessage = (e) => {
      console.log('[Admin Sync]', e.data);
      if (e.data && e.data.action && e.data.action.startsWith('BUZZER_')) {
        refreshBuzzerData();
      } else if (e.data && e.data.action && e.data.action.startsWith('ROUND2_')) {
        refreshRound2Data();
      } else {
        refreshAdminData(false);
      }
    };
  }
  // Setup auto-poll every 5 seconds for admin general data
  setInterval(() => {
    refreshAdminData(false);
  }, 5000);

  // Fast auto-poll for buzzer queue (every 900ms) to catch participant clicks in real time
  setInterval(() => {
    const buzzerTab = document.getElementById('tab-buzzer');
    const isBuzzerTabVisible = buzzerTab && buzzerTab.style.display !== 'none';
    if (isBuzzerTabVisible || (currentBuzzerState && currentBuzzerState.enabled)) {
      refreshBuzzerData();
    }

    const round2Tab = document.getElementById('tab-round2');
    const isRound2TabVisible = round2Tab && round2Tab.style.display !== 'none';
    if (isRound2TabVisible || (currentRound2State && currentRound2State.enabled)) {
      refreshRound2Data();
    }
  }, 900);
});

function showAdminAuthModal() {
  const modal = document.getElementById('admin-auth-modal');
  if (modal) {
    modal.classList.add('active');
    const input = document.getElementById('admin-passcode-input');
    if (input) input.focus();
  }
}

async function verifyAdminAuth() {
  const input = document.getElementById('admin-passcode-input');
  const errorEl = document.getElementById('admin-auth-error');
  const passcode = input.value.trim();

  if (!passcode) {
    errorEl.textContent = 'Please enter the admin passcode.';
    errorEl.style.display = 'block';
    return;
  }

  try {
    const res = await StateCraftAPI.adminLogin(passcode);
    if (res.success) {
      sessionStorage.setItem('statecraft_admin_auth', res.adminToken || 'authorized');
      document.getElementById('admin-auth-modal').classList.remove('active');
      document.getElementById('admin-content-wrapper').style.display = 'block';
      showToast('Admin access unlocked', 'success');
      await initAdminPortal();
    } else {
      errorEl.textContent = res.error || 'Incorrect passcode. Please try again.';
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.textContent = 'Connection error. Please ensure server is running.';
    errorEl.style.display = 'block';
  }
}

async function initAdminPortal() {
  await refreshAdminData(true);
  setupRegionFilters();
  setupSearchInput();
}

async function refreshAdminData(showLoading = false) {
  try {
    stateCraftData = await StateCraftAPI.fetchAllData();
    renderSummaryStats();
    renderTeamsTable();
    renderStatesGrid();
    renderLeaderboard();
    populateStateDropdowns();
    await refreshBuzzerData();
    await refreshRound2Data();
    renderAdminMarketDashboard();
  } catch (err) {
    console.error('Failed to load StateCraft data:', err);
    if (showLoading) showToast('Could not reach server. Working with local cache.', 'error');
  }
}

// Navigation Tabs
function setupNavigationTabs() {
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.dataset.tab;
      document.querySelectorAll('.tab-section').forEach(sec => sec.style.display = 'none');
      const targetSec = document.getElementById(targetTab);
      if (targetSec) targetSec.style.display = 'block';
      if (targetTab === 'tab-market') {
        renderAdminMarketDashboard();
      }
    });
  });
}

// Summary Stat Cards
function renderSummaryStats() {
  const teams = stateCraftData.teams || [];
  const states = stateCraftData.states || [];

  const totalTeams = teams.length;
  const allocatedStates = teams.filter(t => t.allocatedStateId).length;
  const availableStates = states.length - allocatedStates;
  const totalPoints = teams.reduce((acc, t) => acc + (t.points || 0), 0);

  document.getElementById('stat-total-teams').textContent = totalTeams;
  document.getElementById('stat-allocated-states').textContent = allocatedStates;
  document.getElementById('stat-available-states').textContent = availableStates;
  document.getElementById('stat-total-points').textContent = totalPoints;
}

// Teams Table & State Allocation
function renderTeamsTable() {
  const tbody = document.getElementById('teams-table-body');
  if (!tbody) return;

  const teams = stateCraftData.teams || [];
  if (teams.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          No teams registered yet. Click <strong>"+ Add New Team"</strong> above to create a team and allocate a state.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = teams.map((team, idx) => {
    const allocatedState = stateCraftData.states.find(s => s.id === team.allocatedStateId);
    let stateBadge = '';
    if (allocatedState) {
      const critPts = calculateStateTotalCriteriaPoints(allocatedState);
      stateBadge = `
        <div>
          <span class="badge" style="background: rgba(99, 102, 241, 0.2); color: #C7D2FE; border: 1px solid rgba(99, 102, 241, 0.4);">
            🏛️ ${escapeHtml(allocatedState.name)}
          </span>
          <div style="font-size: 0.72rem; color: var(--accent-gold); font-weight: 700; margin-top: 0.2rem;">
            Total Criteria: ${critPts} pts
          </div>
        </div>
      `;
    } else {
      stateBadge = `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #FCA5A5; border: 1px solid rgba(239, 68, 68, 0.3);">Unallocated</span>`;
    }

    return `
      <tr>
        <td style="font-weight: 700; color: #FFFFFF;">${escapeHtml(team.name)}</td>
        <td>${stateBadge}</td>
        <td>
          <div class="flex items-center gap-2">
            <span class="password-masked" id="pwd-${team.id}">••••••••</span>
            <button class="btn btn-secondary btn-sm" onclick="togglePasswordVisibility('${team.id}', '${escapeHtml(team.password)}')" title="Reveal Password">
              👁️
            </button>
          </div>
        </td>
        <td>
          <div class="flex items-center gap-2">
            <span style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800; color: var(--accent-gold);">
              ${team.points || 0}
            </span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">pts</span>
            <button class="btn btn-sm btn-outline-gold" style="margin-left: 0.35rem;" onclick="openScoreModal('${team.id}')">
              + Award Points
            </button>
          </div>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openPointLogsModal('${team.id}')">
            📜 History (${(team.pointLogs || []).length})
          </button>
        </td>
        <td>
          <div class="flex items-center gap-2">
            <button class="btn btn-secondary btn-sm" onclick="openEditTeamModal('${team.id}')" title="Edit Team / Reallocate State">
              ✏️ Edit
            </button>
            <button class="btn btn-danger btn-sm" onclick="confirmDeleteTeam('${team.id}', '${escapeHtml(team.name)}')" title="Delete Team">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function togglePasswordVisibility(teamId, pwd) {
  const el = document.getElementById(`pwd-${teamId}`);
  if (el) {
    if (el.textContent === '••••••••') {
      el.textContent = pwd;
      el.style.fontFamily = 'var(--font-mono)';
      el.style.color = '#38BDF8';
    } else {
      el.textContent = '••••••••';
      el.style.fontFamily = 'inherit';
      el.style.color = 'inherit';
    }
  }
}

// Populate State Dropdowns for Team Creation & Edit
function populateStateDropdowns() {
  const selects = [document.getElementById('new-team-state-select'), document.getElementById('edit-team-state-select')];
  const states = stateCraftData.states || [];
  const teams = stateCraftData.teams || [];

  selects.forEach(select => {
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Do Not Allocate Yet (Unallocated) --</option>';

    // Group states by region
    const regions = ['North India', 'South India', 'East India', 'West India', 'Central India', 'Northeast India'];
    regions.forEach(region => {
      const regionStates = states.filter(s => s.region === region);
      if (regionStates.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = region;
        regionStates.forEach(st => {
          const opt = document.createElement('option');
          opt.value = st.id;
          const assignedTeam = teams.find(t => t.allocatedStateId === st.id);
          if (assignedTeam) {
            opt.textContent = `${st.name} [Allocated to: ${assignedTeam.name}]`;
          } else {
            opt.textContent = `${st.name} (✓ Available)`;
          }
          optgroup.appendChild(opt);
        });
        select.appendChild(optgroup);
      }
    });

    if (currentVal) select.value = currentVal;
  });
}

// Modal: Add New Team
function openAddTeamModal() {
  document.getElementById('new-team-name').value = '';
  document.getElementById('new-team-password').value = generatePassword();
  document.getElementById('new-team-state-select').value = '';
  document.getElementById('add-team-error').style.display = 'none';
  populateStateDropdowns();
  document.getElementById('add-team-modal').classList.add('active');
}

function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 6; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'sc_' + pwd;
}

async function handleCreateTeam() {
  const name = document.getElementById('new-team-name').value.trim();
  const password = document.getElementById('new-team-password').value.trim();
  const stateId = document.getElementById('new-team-state-select').value;
  const errorEl = document.getElementById('add-team-error');

  if (!name || !password) {
    errorEl.textContent = 'Team Name and Password are required.';
    errorEl.style.display = 'block';
    return;
  }

  try {
    const res = await StateCraftAPI.createTeam({
      name,
      password,
      allocatedStateId: stateId || null
    });

    if (res.success) {
      showToast(`Team "${name}" created successfully!`, 'success');
      document.getElementById('add-team-modal').classList.remove('active');
      await refreshAdminData();
    } else {
      errorEl.textContent = res.error || 'Failed to create team';
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.textContent = 'Error connecting to server.';
    errorEl.style.display = 'block';
  }
}

// Modal: Edit Team
function openEditTeamModal(teamId) {
  const team = stateCraftData.teams.find(t => t.id === teamId);
  if (!team) return;

  document.getElementById('edit-team-id').value = team.id;
  document.getElementById('edit-team-name').value = team.name;
  document.getElementById('edit-team-password').value = team.password;
  document.getElementById('edit-team-error').style.display = 'none';
  populateStateDropdowns();
  document.getElementById('edit-team-state-select').value = team.allocatedStateId || '';

  document.getElementById('edit-team-modal').classList.add('active');
}

async function handleSaveTeamEdit() {
  const teamId = document.getElementById('edit-team-id').value;
  const name = document.getElementById('edit-team-name').value.trim();
  const password = document.getElementById('edit-team-password').value.trim();
  const stateId = document.getElementById('edit-team-state-select').value;
  const errorEl = document.getElementById('edit-team-error');

  if (!name || !password) {
    errorEl.textContent = 'Team Name and Password cannot be empty.';
    errorEl.style.display = 'block';
    return;
  }

  try {
    const res = await StateCraftAPI.updateTeam(teamId, {
      name,
      password,
      allocatedStateId: stateId || ""
    });

    if (res.success) {
      showToast(`Team "${name}" updated and state allocated!`, 'success');
      document.getElementById('edit-team-modal').classList.remove('active');
      await refreshAdminData();
    } else {
      errorEl.textContent = res.error || 'Failed to update team';
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.textContent = 'Error connecting to server.';
    errorEl.style.display = 'block';
  }
}

// Delete Team
async function confirmDeleteTeam(teamId, teamName) {
  if (confirm(`Are you sure you want to delete "${teamName}"?\nTheir allocated state will become available again.`)) {
    try {
      const res = await StateCraftAPI.deleteTeam(teamId);
      if (res.success) {
        showToast(`Team "${teamName}" deleted.`, 'info');
        await refreshAdminData();
      } else {
        showToast(res.error || 'Could not delete team', 'error');
      }
    } catch (err) {
      showToast('Error deleting team from server.', 'error');
    }
  }
}

// Scoring / Points Management
function openScoreModal(teamId) {
  const team = stateCraftData.teams.find(t => t.id === teamId);
  if (!team) return;
  currentlyScoringTeam = team;

  document.getElementById('score-team-name-display').textContent = team.name;
  document.getElementById('score-current-points-display').textContent = team.points || 0;
  document.getElementById('score-points-input').value = '25';
  document.getElementById('score-reason-input').value = '';
  const catInput = document.getElementById('score-category-input');
  if (catInput) catInput.value = 'Round 1: Policy Pitch';
  document.getElementById('score-modal-error').style.display = 'none';

  updateScoreMathPreview();

  // Attach live calculation listener if not already attached
  const ptsInput = document.getElementById('score-points-input');
  if (ptsInput && !ptsInput.dataset.listenerAttached) {
    ptsInput.addEventListener('input', updateScoreMathPreview);
    ptsInput.dataset.listenerAttached = 'true';
  }

  document.getElementById('award-points-modal').classList.add('active');
}

function updateScoreMathPreview() {
  if (!currentlyScoringTeam) return;
  const currentPts = currentlyScoringTeam.points || 0;
  const inputVal = parseInt(document.getElementById('score-points-input').value, 10) || 0;
  const newTotal = Math.max(0, currentPts + inputVal);

  const currentEl = document.getElementById('math-current-pts');
  const addedEl = document.getElementById('math-added-pts');
  const projEl = document.getElementById('math-projected-pts');

  if (currentEl) currentEl.textContent = currentPts;
  if (addedEl) addedEl.textContent = (inputVal >= 0 ? '+' : '') + inputVal;
  if (projEl) projEl.textContent = newTotal;

  // Allocated state and criteria points
  const allocatedState = stateCraftData.states.find(s => s.id === currentlyScoringTeam.allocatedStateId);
  const stateDisplay = document.getElementById('score-state-name-display');
  const stateBadge = document.getElementById('score-state-criteria-pts-badge');
  if (allocatedState) {
    const critPts = calculateStateTotalCriteriaPoints(allocatedState);
    if (stateDisplay) stateDisplay.textContent = allocatedState.name;
    if (stateBadge) stateBadge.textContent = `Total Criteria Points: ${critPts} pts (Unaffected)`;
  } else {
    if (stateDisplay) stateDisplay.textContent = 'Unallocated';
    if (stateBadge) stateBadge.textContent = 'No State Allocated';
  }
}

function setPointsPreset(val) {
  document.getElementById('score-points-input').value = val;
  updateScoreMathPreview();
}

function setCategoryPreset(catName) {
  const catInput = document.getElementById('score-category-input');
  if (catInput) {
    catInput.value = catName;
    catInput.focus();
  }
}

async function handleAwardPoints() {
  if (!currentlyScoringTeam) return;

  const pointsChange = parseInt(document.getElementById('score-points-input').value, 10);
  const catInput = document.getElementById('score-category-input');
  const category = (catInput ? catInput.value.trim() : '') || 'Round Evaluation';
  const reason = document.getElementById('score-reason-input').value.trim() || 'Points awarded by Admin';
  const errorEl = document.getElementById('score-modal-error');

  if (isNaN(pointsChange) || pointsChange === 0) {
    errorEl.textContent = 'Please enter a valid non-zero points value.';
    errorEl.style.display = 'block';
    return;
  }

  try {
    const res = await StateCraftAPI.awardPoints(currentlyScoringTeam.id, pointsChange, category, reason);
    if (res.success) {
      showToast(`${pointsChange > 0 ? '+' : ''}${pointsChange} points given to ${currentlyScoringTeam.name}!`, 'success');
      document.getElementById('award-points-modal').classList.remove('active');
      await refreshAdminData();
    } else {
      errorEl.textContent = res.error || 'Failed to award points';
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.textContent = 'Server connection error';
    errorEl.style.display = 'block';
  }
}

// Point Logs Modal
function openPointLogsModal(teamId) {
  const team = stateCraftData.teams.find(t => t.id === teamId);
  if (!team) return;

  document.getElementById('logs-team-name').textContent = team.name;
  const logsContainer = document.getElementById('logs-list-container');

  const logs = team.pointLogs || [];
  if (logs.length === 0) {
    logsContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No point transactions recorded yet.</p>';
  } else {
    logsContainer.innerHTML = logs.map(log => {
      const isPos = log.pointsChange > 0;
      const isNeg = log.pointsChange < 0;
      const tagClass = isPos ? 'positive' : (isNeg ? 'negative' : 'zero');
      const sign = isPos ? '+' : '';

      return `
        <div class="point-log-item">
          <div>
            <div class="flex items-center gap-2" style="margin-bottom: 0.3rem;">
              <span class="badge badge-indigo">${escapeHtml(log.category || 'General')}</span>
              <span style="font-size: 0.78rem; color: var(--text-muted);">${log.timestamp || ''}</span>
            </div>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0;">${escapeHtml(log.reason || 'No remarks')}</p>
          </div>
          <div class="log-points-tag ${tagClass}">
            ${sign}${log.pointsChange}
          </div>
        </div>
      `;
    }).join('');
  }

  document.getElementById('point-logs-modal').classList.add('active');
}

// 28 Indian States Grid & Criteria Matrix
function setupRegionFilters() {
  const pills = document.querySelectorAll('.region-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeRegion = pill.dataset.region;
      renderStatesGrid();
    });
  });
}

function setupSearchInput() {
  const searchInput = document.getElementById('state-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      stateSearchQuery = e.target.value.trim().toLowerCase();
      renderStatesGrid();
    });
  }
}

function renderStatesGrid() {
  const grid = document.getElementById('states-cards-grid');
  if (!grid) return;

  let states = stateCraftData.states || [];
  const teams = stateCraftData.teams || [];

  // Filter by region
  if (activeRegion !== 'ALL') {
    states = states.filter(s => s.region.toUpperCase().includes(activeRegion));
  }

  // Filter by search query
  if (stateSearchQuery) {
    states = states.filter(s => 
      s.name.toLowerCase().includes(stateSearchQuery) || 
      s.capital.toLowerCase().includes(stateSearchQuery) ||
      s.region.toLowerCase().includes(stateSearchQuery)
    );
  }

  if (states.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No states matched your filter.</div>';
    return;
  }

  grid.innerHTML = states.map(state => {
    const assignedTeam = teams.find(t => t.allocatedStateId === state.id);
    const allocationBadge = assignedTeam
      ? `<span class="state-allocation-badge assigned">🟢 Allocated: ${escapeHtml(assignedTeam.name)}</span>`
      : `<span class="state-allocation-badge available">⚪ Available</span>`;

    const c = state.criteria || {};
    const getCritPts = (key) => (c[key] && c[key].points !== undefined && !isNaN(c[key].points)) 
      ? Number(c[key].points) 
      : extractInitialPointsFromCriterion(key, c[key]);

    const stateTotalPts = Object.keys(CRITERIA_METADATA).reduce((sum, k) => sum + getCritPts(k), 0);

    return `
      <div class="state-card-admin">
        <div>
          <div class="state-card-header">
            <div>
              <div class="flex items-center gap-2">
                <span class="state-name">${escapeHtml(state.name)}</span>
                <span class="badge badge-gold" style="font-size: 0.75rem; font-weight: 800; padding: 0.1rem 0.5rem;">⭐ ${stateTotalPts} pts</span>
              </div>
              <div class="state-subtext">Capital: ${escapeHtml(state.capital)} • ${escapeHtml(state.region)}</div>
            </div>
            ${allocationBadge}
          </div>

          <div class="state-criteria-summary-grid">
            <div class="criteria-summary-item">
              <span class="criteria-summary-label">Education (${getCritPts('education')} pts)</span>
              <div class="criteria-summary-value">${c.education ? c.education.value : '—'}</div>
            </div>
            <div class="criteria-summary-item">
              <span class="criteria-summary-label">Healthcare (${getCritPts('healthcare')} pts)</span>
              <div class="criteria-summary-value">${c.healthcare ? c.healthcare.value : '—'}</div>
            </div>
            <div class="criteria-summary-item">
              <span class="criteria-summary-label">Infrastructure (${getCritPts('infrastructure')} pts)</span>
              <div class="criteria-summary-value">${c.infrastructure ? c.infrastructure.value : '—'}</div>
            </div>
            <div class="criteria-summary-item">
              <span class="criteria-summary-label">Population (${getCritPts('population')} pts)</span>
              <div class="criteria-summary-value">${c.population ? c.population.value : '—'}</div>
            </div>
            <div class="criteria-summary-item">
              <span class="criteria-summary-label">Industry (${getCritPts('industrial_development')} pts)</span>
              <div class="criteria-summary-value">${c.industrial_development ? c.industrial_development.value : '—'}</div>
            </div>
            <div class="criteria-summary-item">
              <span class="criteria-summary-label">Law (${getCritPts('law_enforcement')} pts)</span>
              <div class="criteria-summary-value">${c.law_enforcement ? c.law_enforcement.value : '—'}</div>
            </div>
            <div class="criteria-summary-item">
              <span class="criteria-summary-label">Per Capita (${getCritPts('per_capita')} pts)</span>
              <div class="criteria-summary-value">${c.per_capita ? c.per_capita.value : '—'}</div>
            </div>
            <div class="criteria-summary-item">
              <span class="criteria-summary-label">State Debt (${getCritPts('state_debt')} pts)</span>
              <div class="criteria-summary-value">${c.state_debt ? c.state_debt.value : '—'}</div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between" style="padding-top: 0.75rem; border-top: 1px solid rgba(255, 255, 255, 0.06);">
          <span style="font-size: 0.75rem; color: var(--text-muted);">8 Criteria Configured</span>
          <button class="btn btn-primary btn-sm" onclick="openEditStateCriteriaModal('${state.id}')">
            ⚙️ Edit Criteria
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================================
// Points-to-Criteria Transformation Engine
// ==========================================================

let featurePointsState = {};
let activeCriteriaTab = 'education';

function convertPointsToCriteria(criterionKey, points, stateData) {
  const p = Math.max(0, Math.min(100, Math.round(Number(points) || 0)));

  let status = 'Moderate';
  if (p >= 80) status = 'Excellent';
  else if (p >= 65) status = 'Good';
  else if (p >= 45) status = 'Moderate';
  else if (p >= 30) status = 'Needs Attention';
  else status = 'Critical';

  switch (criterionKey) {
    case 'education': {
      const literacy = (50 + p * 0.49).toFixed(1);
      const ger = (12 + p * 0.42).toFixed(1);
      const tier = p >= 80 ? 'Top Tier 1' : (p >= 60 ? 'Tier 2' : 'Tier 3');
      return {
        points: p,
        value: `${literacy}%`,
        metric: 'Literacy Rate',
        subValue: `Higher Edu GER: ${ger}% | Rank: ${tier}`,
        status: status,
        responsibility: p >= 75
          ? 'Advanced digital classroom rollout, university research incubators, and universal secondary schooling access.'
          : p >= 50
          ? 'Standard secondary school modernization, vocational polytechnic expansion, and teacher training programs.'
          : 'Remedial primary schooling, high dropout mitigation, and basic infrastructure grants for rural schools.'
      };
    }
    case 'healthcare': {
      const healthIdx = (35 + p * 0.55).toFixed(1);
      const imr = Math.max(5, Math.round(55 - p * 0.48));
      const beds = Math.round(8 + p * 0.35);
      return {
        points: p,
        value: `${healthIdx} / 100`,
        metric: 'NITI Health Index',
        subValue: `IMR: ${imr} per 1,000 | Beds: ${beds} per 10k`,
        status: status,
        responsibility: p >= 75
          ? 'Universal cashless health coverage, super-specialty medical college expansion, and advanced telemedicine.'
          : p >= 50
          ? 'Strengthening primary health centers (PHCs), mobile maternal care units, and district hospital capacity.'
          : 'Emergency upgrade of rural sub-centers, combating malnutrition, and basic medical supplies procurement.'
      };
    }
    case 'infrastructure': {
      const km = Math.round(15000 + p * 3100);
      const powerGW = (4 + p * 0.38).toFixed(1);
      return {
        points: p,
        value: `${km.toLocaleString('en-IN')} km`,
        metric: 'Road & Highway Network',
        subValue: `Power Grid: ${powerGW} GW | Logistics Score: ${p}/100`,
        status: status,
        responsibility: p >= 75
          ? 'Expanding high-speed access-controlled expressways, deep-sea ports, and 24x7 renewable power corridors.'
          : p >= 50
          ? 'State highway four-laning, industrial freight rail links, and smart urban transit bus systems.'
          : 'Basic rural all-weather connectivity under PMGSY, flood-resilient bridges, and grid stabilization.'
      };
    }
    case 'population': {
      const hdi = (0.50 + p * 0.004).toFixed(3);
      const urbanPct = Math.round(20 + p * 0.55);
      const origPop = (stateData && stateData.criteria && stateData.criteria.population && stateData.criteria.population.value) 
        ? stateData.criteria.population.value.split(' ')[0] 
        : '45.0';
      return {
        points: p,
        value: `${origPop} M (HDI: ${hdi})`,
        metric: 'Population & HDI',
        subValue: `Urbanization: ${urbanPct}% | Welfare Index: ${p}/100`,
        status: status,
        responsibility: p >= 75
          ? 'Comprehensive social security net, high urban quality of life, youth skilling, and digital welfare delivery.'
          : p >= 50
          ? 'Targeted food distribution, rural employment guarantee schemes, and urban municipal amenities.'
          : 'Essential poverty alleviation transfers, maternal nutrition support, and migrant worker relief.'
      };
    }
    case 'industrial_development': {
      const isSmallState = stateData && stateData.criteria && stateData.criteria.industrial_development && !stateData.criteria.industrial_development.value.includes('Lakh');
      const output = isSmallState 
        ? `₹${Math.round(10000 + p * 850).toLocaleString('en-IN')} Cr`
        : `₹${(1.2 + p * 0.14).toFixed(2)} Lakh Cr`;
      const eodb = p >= 80 ? 'DPIIT Top Achiever' : (p >= 60 ? 'Achiever Tier' : (p >= 40 ? 'Emerging Hub' : 'Aspirer'));
      return {
        points: p,
        value: output,
        metric: 'Industrial Output',
        subValue: `Ease of Business: ${eodb} | Tech Clusters`,
        status: status,
        responsibility: p >= 75
          ? 'High-tech manufacturing clusters (semiconductors, electronics, pharma, EV hubs) and export expansion.'
          : p >= 50
          ? 'MSME corridor development, food processing zones, and textile industrial parks.'
          : 'Single-window clearance facilitation, industrial infrastructure incentives, and local artisan promotion.'
      };
    }
    case 'law_enforcement': {
      const safetyIdx = (42 + p * 0.52).toFixed(1);
      const respTime = Math.max(6, Math.round(26 - p * 0.22));
      const policeRatio = Math.round(110 + p * 1.1);
      return {
        points: p,
        value: `${safetyIdx} / 100`,
        metric: 'Safety Index',
        subValue: `Dial 112 Response: ${respTime} mins | Police: ${policeRatio}/lakh`,
        status: status,
        responsibility: p >= 75
          ? 'Integrated AI command-and-control surveillance, specialized women safety wings, and rapid forensics.'
          : p >= 50
          ? 'Modernized beat policing, smart city camera networks, and traffic automation.'
          : 'Upgrading basic police mobility, border & highway patrols, and rural law enforcement infrastructure.'
      };
    }
    case 'per_capita': {
      const income = Math.round(55000 + p * 4400);
      const growth = (4.8 + p * 0.08).toFixed(1);
      return {
        points: p,
        value: `₹${income.toLocaleString('en-IN')} / yr`,
        metric: 'NSDP Per Capita',
        subValue: `+${growth}% YoY Growth | Benchmark: ${status}`,
        status: status,
        responsibility: p >= 75
          ? 'High-wage knowledge services, technology exports, and robust household disposable income growth.'
          : p >= 50
          ? 'Agrarian surplus value addition, food processing, and tier-2 city commercial employment.'
          : 'Basic wage floor protection, micro-finance credit access, and rural livelihood schemes.'
      };
    }
    case 'state_debt': {
      // In governance simulations: higher points = more fiscal discipline = lower debt!
      const debtRatio = Math.max(12.0, (50 - p * 0.38)).toFixed(1);
      const deficit = Math.max(1.8, (4.8 - p * 0.032)).toFixed(1);
      return {
        points: p,
        value: `${debtRatio}%`,
        metric: 'Debt-to-GSDP Ratio',
        subValue: `Fiscal Deficit: ${deficit}% | Fiscal Health: ${status}`,
        status: status,
        responsibility: p >= 75
          ? 'Prudent FRBM compliance, low borrowing spreads, and reinvesting surplus into capital assets.'
          : p >= 50
          ? 'Balancing public guarantee commitments with debt servicing and state GST tax buoyancy.'
          : 'Fiscal consolidation required to control legacy liabilities, power DISCOM losses, and deficits.'
      };
    }
    default:
      return { points: p, value: `${p} pts`, metric: 'Score', subValue: status, status: status, responsibility: '' };
  }
}

function extractInitialPointsFromCriterion(critKey, crit) {
  if (!crit) return 65;
  if (crit.points !== undefined && !isNaN(crit.points)) return Number(crit.points);

  // Extract from existing value
  const val = String(crit.value || '');
  const numMatch = val.match(/([0-9]+(?:\.[0-9]+)?)/);
  const num = numMatch ? parseFloat(numMatch[1]) : 65;

  switch (critKey) {
    case 'education':
      return Math.max(10, Math.min(100, Math.round((num - 50) / 0.49)));
    case 'healthcare':
      return Math.max(10, Math.min(100, Math.round((num - 35) / 0.55)));
    case 'law_enforcement':
      return Math.max(10, Math.min(100, Math.round((num - 42) / 0.52)));
    case 'state_debt':
      return Math.max(10, Math.min(100, Math.round((50 - num) / 0.38)));
    case 'per_capita': {
      const cleanNum = parseFloat(val.replace(/[^0-9]/g, '')) || 150000;
      return Math.max(10, Math.min(100, Math.round((cleanNum - 55000) / 4400)));
    }
    default:
      if (crit.status === 'Excellent') return 88;
      if (crit.status === 'Good') return 72;
      if (crit.status === 'Needs Attention') return 38;
      if (crit.status === 'Critical') return 22;
      return 60;
  }
}

// Modal: Open State Criteria Editor via Points Converter
function openEditStateCriteriaModal(stateId) {
  try {
    const modal = document.getElementById('edit-state-criteria-modal');
    if (!modal) {
      console.error('Modal edit-state-criteria-modal element not found in DOM!');
      return;
    }

    const state = (stateCraftData.states || []).find(s => s.id === stateId);
    if (!state) {
      console.error('State not found for id:', stateId);
      showToast('State data not found for ' + stateId, 'error');
      return;
    }
    currentlyEditingState = JSON.parse(JSON.stringify(state)); // deep copy

    const nameDisplay = document.getElementById('edit-state-name-display');
    const metaDisplay = document.getElementById('edit-state-meta-display');
    if (nameDisplay) nameDisplay.textContent = state.name;
    if (metaDisplay) metaDisplay.textContent = `Capital: ${state.capital} • Region: ${state.region}`;

    const container = document.getElementById('points-converter-cards-container');
    const criteriaKeys = Object.keys(CRITERIA_METADATA);
    featurePointsState = {};

    if (container) {
      container.innerHTML = criteriaKeys.map(key => {
        const meta = CRITERIA_METADATA[key] || { title: key, icon: '📌' };
        const existingCrit = (currentlyEditingState.criteria && currentlyEditingState.criteria[key]) || {};
        const initPoints = extractInitialPointsFromCriterion(key, existingCrit);
        featurePointsState[key] = initPoints;

        // Compute converted criteria preview
        const converted = convertPointsToCriteria(key, initPoints, currentlyEditingState);
        if (!currentlyEditingState.criteria) currentlyEditingState.criteria = {};
        currentlyEditingState.criteria[key] = converted;

        return `
          <div class="feature-point-card" id="feature-card-${key}">
            <div>
              <div class="feature-point-header">
                <div class="feature-point-title">
                  <span style="font-size: 1.25rem;">${meta.icon}</span>
                  <span>${meta.title}</span>
                </div>
                <div id="badge-preview-${key}">
                  ${getStatusBadge(converted.status)}
                </div>
              </div>

              <div class="point-slider-wrap">
                <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Points:</span>
                <input 
                  type="number" 
                  id="point-input-${key}" 
                  class="point-number-input" 
                  min="0" 
                  max="100" 
                  value="${initPoints}" 
                  oninput="handlePointChange('${key}', this.value)"
                >
                <input 
                  type="range" 
                  id="point-slider-${key}" 
                  class="point-range-slider" 
                  min="0" 
                  max="100" 
                  value="${initPoints}" 
                  oninput="handlePointChange('${key}', this.value)"
                >
              </div>

              <div class="converted-preview-box">
                <div class="converted-val-row">
                  <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">
                    ⚡ Converted Value:
                  </span>
                  <span id="preview-val-${key}" class="converted-val-primary">
                    ${converted.value}
                  </span>
                </div>
                <div id="preview-subval-${key}" class="converted-subval">
                  ${converted.subValue}
                </div>
                <div id="preview-resp-${key}" class="converted-resp-text">
                  ${converted.responsibility}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Setup manual text overrides tabs
    setupManualOverridesTabs();

    modal.classList.add('active');
  } catch (err) {
    console.error('Error opening criteria modal:', err);
    showToast('Failed to open criteria modal: ' + err.message, 'error');
  }
}

// Handler when points change for any feature
function handlePointChange(key, val) {
  let p = parseInt(val, 10);
  if (isNaN(p)) p = 0;
  p = Math.max(0, Math.min(100, p));

  featurePointsState[key] = p;

  // Sync input & slider
  const inputEl = document.getElementById(`point-input-${key}`);
  const sliderEl = document.getElementById(`point-slider-${key}`);
  if (inputEl && inputEl.value !== String(p)) inputEl.value = p;
  if (sliderEl && sliderEl.value !== String(p)) sliderEl.value = p;

  // Convert points to features
  const converted = convertPointsToCriteria(key, p, currentlyEditingState);
  if (!currentlyEditingState.criteria) currentlyEditingState.criteria = {};
  currentlyEditingState.criteria[key] = converted;

  // Update card preview
  const previewVal = document.getElementById(`preview-val-${key}`);
  const previewSubval = document.getElementById(`preview-subval-${key}`);
  const previewResp = document.getElementById(`preview-resp-${key}`);
  const badgePreview = document.getElementById(`badge-preview-${key}`);

  if (previewVal) previewVal.textContent = converted.value;
  if (previewSubval) previewSubval.textContent = converted.subValue;
  if (previewResp) previewResp.textContent = converted.responsibility;
  if (badgePreview) badgePreview.innerHTML = getStatusBadge(converted.status);

  // Sync to manual form if open
  if (activeCriteriaTab === key) {
    populateCriteriaForm(key);
  }
}

// Quick Preset Application to all 8 features
function applyPointsToAllFeatures(pointsVal) {
  const criteriaKeys = Object.keys(CRITERIA_METADATA);
  criteriaKeys.forEach(key => {
    handlePointChange(key, pointsVal);
  });
  showToast(`Applied ${pointsVal} points to all 8 features!`, 'info');
}

function applyCustomPointsToAll() {
  const customInput = document.getElementById('quick-all-points-input');
  const val = parseInt(customInput.value, 10) || 75;
  applyPointsToAllFeatures(val);
}

// Manual Text Overrides Section
let manualOverridesVisible = false;

function toggleManualOverridesSection() {
  manualOverridesVisible = !manualOverridesVisible;
  const container = document.getElementById('manual-overrides-container');
  const label = document.getElementById('manual-overrides-btn-label');
  if (container) {
    container.style.display = manualOverridesVisible ? 'block' : 'none';
  }
  if (label) {
    label.textContent = manualOverridesVisible ? 'Hide Advanced / Manual Text Editor' : 'Show Advanced / Manual Text Editor';
  }
}

function setupManualOverridesTabs() {
  const tabsContainer = document.getElementById('criteria-edit-tabs');
  if (!tabsContainer) return;
  const criteriaKeys = Object.keys(CRITERIA_METADATA);

  tabsContainer.innerHTML = criteriaKeys.map(key => {
    const meta = CRITERIA_METADATA[key];
    const isAct = key === activeCriteriaTab ? 'active' : '';
    return `
      <button type="button" class="modal-tab-btn ${isAct}" onclick="switchCriteriaTab('${key}')">
        ${meta.icon} ${meta.title}
      </button>
    `;
  }).join('');

  populateCriteriaForm(activeCriteriaTab);
}

function switchCriteriaTab(critKey) {
  activeCriteriaTab = critKey;
  const btns = document.querySelectorAll('#criteria-edit-tabs .modal-tab-btn');
  const criteriaKeys = Object.keys(CRITERIA_METADATA);
  btns.forEach((btn, idx) => {
    if (criteriaKeys[idx] === critKey) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  populateCriteriaForm(critKey);
}

function populateCriteriaForm(critKey) {
  if (!critKey) critKey = 'education';
  if (!currentlyEditingState || !currentlyEditingState.criteria) return;
  const crit = currentlyEditingState.criteria[critKey] || {
    value: '',
    metric: '',
    subValue: '',
    responsibility: '',
    status: 'Moderate'
  };

  const meta = CRITERIA_METADATA[critKey] || { title: critKey, icon: '📌', description: '' };
  const titleEl = document.getElementById('crit-field-title');
  const descEl = document.getElementById('crit-field-desc');
  const valEl = document.getElementById('crit-input-value');
  const metricEl = document.getElementById('crit-input-metric');
  const subvalEl = document.getElementById('crit-input-subvalue');
  const statusEl = document.getElementById('crit-input-status');
  const respEl = document.getElementById('crit-input-responsibility');

  if (titleEl) titleEl.textContent = `${meta.icon} ${meta.title} — Manual Override`;
  if (descEl) descEl.textContent = `Fine-tune converted text directly for ${meta.title}:`;
  if (valEl) valEl.value = crit.value || '';
  if (metricEl) metricEl.value = crit.metric || '';
  if (subvalEl) subvalEl.value = crit.subValue || '';
  if (statusEl) statusEl.value = crit.status || 'Moderate';
  if (respEl) respEl.value = crit.responsibility || '';
}

function syncManualEditToConvertedState() {
  if (!currentlyEditingState || !currentlyEditingState.criteria) return;
  const key = activeCriteriaTab;
  if (!currentlyEditingState.criteria[key]) currentlyEditingState.criteria[key] = {};

  currentlyEditingState.criteria[key].value = document.getElementById('crit-input-value').value.trim();
  currentlyEditingState.criteria[key].metric = document.getElementById('crit-input-metric').value.trim();
  currentlyEditingState.criteria[key].subValue = document.getElementById('crit-input-subvalue').value.trim();
  currentlyEditingState.criteria[key].status = document.getElementById('crit-input-status').value;
  currentlyEditingState.criteria[key].responsibility = document.getElementById('crit-input-responsibility').value.trim();

  // Update preview card
  const previewVal = document.getElementById(`preview-val-${key}`);
  const previewSubval = document.getElementById(`preview-subval-${key}`);
  const previewResp = document.getElementById(`preview-resp-${key}`);
  const badgePreview = document.getElementById(`badge-preview-${key}`);

  if (previewVal) previewVal.textContent = currentlyEditingState.criteria[key].value;
  if (previewSubval) previewSubval.textContent = currentlyEditingState.criteria[key].subValue;
  if (previewResp) previewResp.textContent = currentlyEditingState.criteria[key].responsibility;
  if (badgePreview) badgePreview.innerHTML = getStatusBadge(currentlyEditingState.criteria[key].status);
}

// Save all converted criteria to server & propagate to participant portal
async function handleSaveStateCriteria() {
  if (!currentlyEditingState) return;

  try {
    const res = await StateCraftAPI.updateStateCriteria(currentlyEditingState.id, {
      criteria: currentlyEditingState.criteria
    });

    if (res.success) {
      showToast(`Criteria converted and saved for ${currentlyEditingState.name}!`, 'success');
      document.getElementById('edit-state-criteria-modal').classList.remove('active');
      await refreshAdminData();
    } else {
      showToast(res.error || 'Failed to update state criteria', 'error');
    }
  } catch (err) {
    showToast('Failed to update state criteria on server', 'error');
  }
}

// Leaderboard View
function renderLeaderboard() {
  const container = document.getElementById('admin-leaderboard-container');
  if (!container) return;

  const teams = [...(stateCraftData.teams || [])].sort((a, b) => (b.points || 0) - (a.points || 0));
  if (teams.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No teams on leaderboard yet.</p>';
    return;
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Team Name</th>
          <th>Allocated State</th>
          <th>Total Points</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${teams.map((t, idx) => {
          const st = stateCraftData.states.find(s => s.id === t.allocatedStateId);
          const medal = idx === 0 ? '🥇 1st' : (idx === 1 ? '🥈 2nd' : (idx === 2 ? '🥉 3rd' : `#${idx + 1}`));
          return `
            <tr>
              <td style="font-weight: 800; color: ${idx === 0 ? 'var(--accent-gold)' : '#FFFFFF'};">${medal}</td>
              <td style="font-weight: 700; color: #FFFFFF;">${escapeHtml(t.name)}</td>
              <td>${st ? `<span class="badge badge-indigo">🏛️ ${escapeHtml(st.name)}</span>` : '<span class="badge badge-moderate">Unallocated</span>'}</td>
              <td style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: var(--accent-gold);">${t.points || 0}</td>
              <td>
                <button class="btn btn-outline-gold btn-sm" onclick="openScoreModal('${t.id}')">+ Award Points</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// Reset Database Confirmation
function confirmResetDatabase() {
  if (confirm('CAUTION: Are you sure you want to reset all data back to original defaults?\nThis will restore initial teams and 28 states values.')) {
    StateCraftAPI.resetDatabase().then(res => {
      if (res.success) {
        showToast('Database reset to defaults successfully!', 'success');
        refreshAdminData();
      } else {
        showToast('Failed to reset database', 'error');
      }
    }).catch(err => {
      showToast('Error communicating with server', 'error');
    });
  }
}

// Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Close modals when clicking backdrop
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('active');
  }
});

/* ==========================================================================
   ROUND 1 RAPID BUZZER ORCHESTRATION (ADMIN)
   ========================================================================== */

async function refreshBuzzerData() {
  try {
    currentBuzzerState = await StateCraftAPI.fetchBuzzerState();
    renderBuzzerHub();
  } catch (e) {
    console.warn('Error refreshing buzzer state:', e);
  }
}

function renderBuzzerHub() {
  const b = currentBuzzerState || { enabled: false, showResults: false, buzzes: [] };
  const isEnabled = Boolean(b.enabled);
  const showResults = Boolean(b.showResults);
  const buzzes = b.buzzes || [];

  // 1. Navigation tab pill badge
  const navBadge = document.getElementById('admin-nav-buzzer-badge');
  if (navBadge) {
    if (isEnabled) {
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

  // 2. Status pill in header
  const statusPill = document.getElementById('admin-buzzer-status-pill');
  if (statusPill) {
    if (isEnabled) {
      statusPill.innerHTML = `
        <div class="status-pill-pulse status-pill-open">
          <span class="pulse-dot-red"></span>
          <span>Buzzer Open for Buzzing</span>
        </div>
      `;
    } else {
      statusPill.innerHTML = `
        <div class="status-pill-pulse status-pill-locked">
          <span>🔒</span>
          <span>Buzzer Locked</span>
        </div>
      `;
    }
  }

  // 3. Toggle Buzzer button
  const toggleBtn = document.getElementById('btn-admin-toggle-buzzer');
  if (toggleBtn) {
    if (isEnabled) {
      toggleBtn.className = 'btn btn-danger';
      toggleBtn.innerHTML = '🔒 Lock Buzzer for Participants';
      toggleBtn.title = 'Prevent participants from pressing the buzzer';
    } else {
      toggleBtn.className = 'btn btn-primary';
      toggleBtn.innerHTML = '⚡ Enable Buzzer for Participants';
      toggleBtn.title = 'Unlock the buzzer button for all participants';
    }
  }

  // 4. Reveal toggle text & button styling
  const revealBtn = document.getElementById('btn-admin-toggle-reveal');
  const revealText = document.getElementById('admin-reveal-state-text');
  if (revealText) {
    if (showResults) {
      revealText.textContent = 'LIVE (VISIBLE TO PARTICIPANTS)';
      revealText.style.color = '#34D399';
      if (revealBtn) revealBtn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    } else {
      revealText.textContent = 'HIDDEN FROM PARTICIPANTS';
      revealText.style.color = '#F87171';
      if (revealBtn) revealBtn.style.borderColor = '';
    }
  }

  // 5. Total count badge
  const countBadge = document.getElementById('admin-buzz-count-badge');
  if (countBadge) {
    countBadge.textContent = `${buzzes.length} Team${buzzes.length === 1 ? '' : 's'} Buzzed`;
  }

  // 6. Queue table and empty state
  const tbody = document.getElementById('admin-buzzer-queue-body');
  const emptyState = document.getElementById('admin-buzzer-empty-state');

  if (!tbody) return;

  if (buzzes.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
  } else {
    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = buzzes.map((buzz, idx) => {
      const rank = buzz.order || (idx + 1);
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
        <tr class="${rowClass}">
          <td>${rankBadgeHtml}</td>
          <td>
            <div style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">
              ${escapeHtml(buzz.teamName)}
            </div>
          </td>
          <td>
            <span class="badge badge-indigo">
              🏛️ ${escapeHtml(buzz.stateName || 'Unallocated')}
            </span>
          </td>
          <td>
            <span style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-secondary);">
              ${escapeHtml(buzz.timestamp || '')}
            </span>
          </td>
          <td>
            <span class="reaction-tag">⚡ ${elapsedStr}</span>
          </td>
          <td>
            <div class="flex items-center gap-2">
              <button class="btn btn-secondary btn-sm" onclick="quickAwardBuzzerPoints('${buzz.teamId}', 10, ${rank})" title="Award +10 pts to ${escapeHtml(buzz.teamName)}">
                +10
              </button>
              <button class="btn btn-secondary btn-sm" onclick="quickAwardBuzzerPoints('${buzz.teamId}', 25, ${rank})" title="Award +25 pts to ${escapeHtml(buzz.teamName)}">
                +25
              </button>
              <button class="btn btn-secondary btn-sm" onclick="openCustomScoreForTeam('${buzz.teamId}')" title="Custom Points for ${escapeHtml(buzz.teamName)}">
                Custom...
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

async function handleAdminToggleBuzzer() {
  const current = currentBuzzerState && currentBuzzerState.enabled;
  const willEnable = !current;

  try {
    const res = await StateCraftAPI.toggleBuzzer(willEnable);
    if (res.success) {
      currentBuzzerState = res.buzzer;
      if (willEnable) {
        if (typeof playBuzzerSound === 'function') playBuzzerSound('unlock');
        showToast('⚡ Buzzer is now OPEN for participants!', 'success');
      } else {
        if (typeof playBuzzerSound === 'function') playBuzzerSound('lock');
        showToast('🔒 Buzzer is now LOCKED.', 'info');
      }
      renderBuzzerHub();
    }
  } catch (err) {
    showToast('Failed to toggle buzzer state', 'error');
  }
}

async function handleAdminToggleReveal() {
  const current = currentBuzzerState && currentBuzzerState.showResults;
  const willReveal = !current;

  try {
    const res = await StateCraftAPI.revealBuzzerOrder(willReveal);
    if (res.success) {
      currentBuzzerState = res.buzzer;
      if (willReveal) {
        if (typeof playBuzzerSound === 'function') playBuzzerSound('reveal');
        showToast('👁️ Buzzer order is now DISPLAYED to participants!', 'success');
      } else {
        showToast('🔒 Buzzer order is now HIDDEN from participants.', 'info');
      }
      renderBuzzerHub();
    }
  } catch (err) {
    showToast('Failed to update reveal setting', 'error');
  }
}

async function handleAdminResetBuzzer() {
  if (!confirm('Are you sure you want to reset the Round 1 Buzzer?\nThis will clear all participant clicks and lock the buzzer for the next question.')) {
    return;
  }

  try {
    const res = await StateCraftAPI.resetBuzzer('Round 1: Rapid Response Buzzer');
    if (res.success) {
      currentBuzzerState = res.buzzer;
      showToast('🔄 Buzzer reset successfully. Queue cleared and locked.', 'info');
      renderBuzzerHub();
    }
  } catch (err) {
    showToast('Failed to reset buzzer', 'error');
  }
}

async function quickAwardBuzzerPoints(teamId, points, rank) {
  try {
    const reason = `Round 1 Rapid Buzzer Rank #${rank} (+${points} pts)`;
    const res = await StateCraftAPI.awardPoints(teamId, points, 'Round 1 Buzzer', reason);
    if (res.success) {
      showToast(`🏆 Awarded +${points} pts to team for buzzer response!`, 'success');
      refreshAdminData(false);
    }
  } catch (err) {
    showToast('Failed to award points', 'error');
  }
}

function openCustomScoreForTeam(teamId) {
  if (typeof openScoreModal === 'function') {
    openScoreModal(teamId);
  }
}

/* ==========================================================================
   ROUND 2: MYSTERY POLICY ARENA (ADMIN CONDUCTED)
   ========================================================================== */

let adminRound2ActiveSector = null; // null initially so sectors are displayed first!
let adminRound2Boxes = [];          // 10 shuffled boxes for chosen sector
let adminRound2SelectedTeamId = null;

async function refreshRound2Data() {
  try {
    const round2 = await StateCraftAPI.fetchRound2State();
    currentRound2State = round2 || { enabled: true, teamSelections: {} };
    // Only update completed table during poll so open boxes aren't reset
    renderAdminRound2CompletedTable();
  } catch (err) {
    console.debug('Failed to sync Round 2 admin data:', err);
  }
}

function initAdminRound2Boxes(critKey) {
  if (typeof ROUND2_MYSTERY_POLICIES === 'undefined' || !ROUND2_MYSTERY_POLICIES[critKey]) {
    adminRound2Boxes = [];
    return;
  }

  const rawPolicies = ROUND2_MYSTERY_POLICIES[critKey];
  const copy = [...rawPolicies];
  // Fisher-Yates shuffle
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  adminRound2Boxes = copy.map((p, idx) => ({
    boxNumber: idx + 1,
    policy: p,
    isFlipped: false
  }));
}

function renderAdminRound2UI() {
  // 1. Render Step 1: Governance Reform Sectors Grid (Always displayed first!)
  const sectorsGrid = document.getElementById('admin-sectors-selection-grid');
  if (sectorsGrid && typeof CRITERIA_METADATA !== 'undefined') {
    const keys = Object.keys(CRITERIA_METADATA);
    sectorsGrid.innerHTML = keys.map(k => {
      const meta = CRITERIA_METADATA[k];
      const isActive = k === adminRound2ActiveSector;
      return `
        <div class="admin-sector-card ${isActive ? 'active' : ''}" onclick="handleAdminSelectSector('${k}')">
          <div class="admin-sector-icon">${meta.icon}</div>
          <div style="flex-grow: 1;">
            <div class="admin-sector-title">${meta.title}</div>
            <div class="admin-sector-subtitle">10 Confidential Policies</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 2. Render Step 2: 10 Mystery Boxes Arena (Visible after selecting a sector)
  const placeholder = document.getElementById('admin-no-sector-placeholder');
  const arena = document.getElementById('admin-active-boxes-arena');

  if (!adminRound2ActiveSector) {
    if (placeholder) placeholder.style.display = 'block';
    if (arena) arena.style.display = 'none';
  } else {
    if (placeholder) placeholder.style.display = 'none';
    if (arena) arena.style.display = 'block';

    const activeMeta = (typeof CRITERIA_METADATA !== 'undefined' && CRITERIA_METADATA[adminRound2ActiveSector]) 
      ? CRITERIA_METADATA[adminRound2ActiveSector] 
      : { icon: '📦', title: adminRound2ActiveSector };

    const titleEl = document.getElementById('admin-active-sector-title');
    if (titleEl) titleEl.innerHTML = `${activeMeta.icon} ${escapeHtml(activeMeta.title)}`;

    // Populate Team / State Selector (Retains selection across renders)
    const teamSelect = document.getElementById('admin-turn-team-select');
    if (teamSelect) {
      const teams = stateCraftData.teams || [];
      if (!adminRound2SelectedTeamId && teams.length > 0) {
        adminRound2SelectedTeamId = teams[0].id;
      }
      teamSelect.innerHTML = teams.map(t => {
        let stateName = 'Unassigned';
        if (t.allocatedStateId) {
          const s = (stateCraftData.states || []).find(x => x.id === t.allocatedStateId);
          if (s) stateName = s.name;
        }
        const isSel = t.id === adminRound2SelectedTeamId;
        return `<option value="${t.id}" ${isSel ? 'selected' : ''}>🏛️ ${escapeHtml(stateName)} — ${escapeHtml(t.name)}</option>`;
      }).join('');
    }

    // Ensure Boxes are initialized if empty
    if (adminRound2Boxes.length === 0) {
      initAdminRound2Boxes(adminRound2ActiveSector);
    }

    // Render 10 3D Flip Mystery Boxes
    const grid = document.getElementById('admin-mystery-boxes-grid');
    if (grid) {
      grid.innerHTML = adminRound2Boxes.map((b, idx) => {
        const p = b.policy;
        const isEff = p.type === 'efficiency_boost' || p.type === 'advantageous';
        const isExt = p.type === 'external_sector';
        
        let tagClass = 'badge-efficiency';
        let tagText = '⚡ Efficiency Boost';
        let backCardClass = 'policy-efficiency-boost';

        if (isExt) {
          tagClass = 'badge-external';
          tagText = '🌐 External Sector';
          backCardClass = 'policy-external-sector';
        } else if (p.type === 'disadvantageous') {
          tagClass = 'badge-disadv';
          tagText = '🔴 Trade-off';
          backCardClass = 'policy-disadvantageous';
        }

        const sign = p.criteriaPointsChange > 0 ? '+' : '';
        const targetMeta = (typeof CRITERIA_METADATA !== 'undefined' && CRITERIA_METADATA[p.targetCriterion]) 
          ? CRITERIA_METADATA[p.targetCriterion] 
          : { title: p.targetCriterion };

        return `
          <div class="mystery-box-card ${b.isFlipped ? 'flipped' : ''}" onclick="handleAdminBoxClick(${idx})">
            <div class="mystery-box-inner">
              <!-- Front Face: Sealed Mystery Box -->
              <div class="mystery-box-front">
                <div class="box-number-badge">MYSTERY BOX #${b.boxNumber}</div>
                <div class="mystery-icon-wrap">📦</div>
                <div class="mystery-front-label">Confidential Policy</div>
                <div class="mystery-front-hint">Touch to flip & reveal particulars</div>
                <div class="mystery-click-action">
                  <span>✨ Touch / Click to Flip</span>
                </div>
              </div>

              <!-- Back Face: Revealed Policy Card -->
              <div class="mystery-box-back ${backCardClass}">
                <div>
                  <div class="flex items-center justify-between" style="margin-bottom: 0.35rem;">
                    <span style="font-size: 0.68rem; font-weight: 800; color: #FFFFFF;">BOX #${b.boxNumber}</span>
                    <span class="policy-badge ${tagClass}">${tagText}</span>
                  </div>
                  <h5 class="policy-title">${escapeHtml(p.title)}</h5>
                  <p class="policy-desc">${escapeHtml(p.description)}</p>
                </div>

                <div class="policy-metrics-box">
                  <div class="metric-row">
                    <span style="color: #94A3B8;">Sector Impact:</span>
                    <strong style="color: ${p.criteriaPointsChange >= 0 ? '#34D399' : '#F87171'};">
                      ${targetMeta.title} (${sign}${p.criteriaPointsChange} pts)
                    </strong>
                  </div>
                  <div class="metric-row" style="margin-top: 0.2rem;">
                    <span style="color: #94A3B8;">Team Score:</span>
                    <strong style="color: ${p.teamPointsChange >= 0 ? '#34D399' : '#F87171'};">
                      ${p.teamPointsChange > 0 ? '+' : ''}${p.teamPointsChange} pts
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Selection Counters & Rules
    const chosenBoxes = adminRound2Boxes.filter(b => b.isFlipped);
    const countEl = document.getElementById('admin-boxes-selected-count');
    if (countEl) countEl.textContent = chosenBoxes.length;

    const effCount = chosenBoxes.filter(b => b.policy.type === 'efficiency_boost' || b.policy.type === 'advantageous').length;
    const extCount = chosenBoxes.filter(b => b.policy.type === 'external_sector' || b.policy.type === 'disadvantageous').length;
    const tradeoffPill = document.getElementById('admin-tradeoff-status-pill');
    if (tradeoffPill) {
      if (chosenBoxes.length === 0) {
        tradeoffPill.className = 'rule-compliance-pill rule-pill-valid';
        tradeoffPill.innerHTML = `<span>✨</span><span>Click any box to flip & unveil</span>`;
      } else {
        tradeoffPill.className = 'rule-compliance-pill rule-pill-valid';
        tradeoffPill.innerHTML = `<span>✓</span><span>${chosenBoxes.length} Opened (${effCount} Sector Efficiency, ${extCount} External Sector)</span>`;
      }
    }

    // Review & Apply Bar (Displays whenever at least 1 box is opened)
    const actionBar = document.getElementById('admin-round2-action-bar');
    const applyBtn = document.getElementById('btn-admin-apply-round2-package');
    if (chosenBoxes.length >= 1) {
      if (actionBar) actionBar.style.display = 'flex';
      const netTeam = chosenBoxes.reduce((acc, b) => acc + (b.policy.teamPointsChange || 0), 0);
      const scorePreview = document.getElementById('admin-round2-score-preview');
      if (scorePreview) {
        scorePreview.textContent = (netTeam > 0 ? '+' : '') + netTeam + ' pts';
        scorePreview.style.color = netTeam >= 0 ? '#34D399' : '#F87171';
      }

      const critPreview = document.getElementById('admin-round2-criteria-preview');
      if (critPreview) {
        const impacts = {};
        chosenBoxes.forEach(b => {
          const crit = b.policy.targetCriterion;
          impacts[crit] = (impacts[crit] || 0) + b.policy.criteriaPointsChange;
        });
        critPreview.innerHTML = Object.entries(impacts).map(([cKey, delta]) => {
          const meta = (typeof CRITERIA_METADATA !== 'undefined' && CRITERIA_METADATA[cKey]) 
            ? CRITERIA_METADATA[cKey] 
            : { title: cKey };
          const cSign = delta > 0 ? '+' : '';
          const cColor = delta >= 0 ? '#34D399' : '#F87171';
          return `
            <span style="background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; padding: 0.2rem 0.55rem; font-size: 0.74rem;">
              ${meta.title}: <strong style="color: ${cColor};">${cSign}${delta} pts</strong>
            </span>
          `;
        }).join('');
      }

      if (applyBtn) {
        applyBtn.disabled = !adminRound2SelectedTeamId;
      }
    } else {
      if (actionBar) actionBar.style.display = 'none';
    }
  }

  // 3. Render Completed Executions Table
  renderAdminRound2CompletedTable();
}

function handleAdminSelectSector(critKey) {
  adminRound2ActiveSector = critKey;
  initAdminRound2Boxes(critKey);
  if (typeof playMysterySound === 'function') playMysterySound('flip');
  renderAdminRound2UI();

  // Smooth scroll down to the bottom of the page where the 10 boxes are
  setTimeout(() => {
    const arena = document.getElementById('admin-round2-boxes-container') || document.getElementById('admin-active-boxes-arena');
    if (arena) {
      arena.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  }, 120);
}

function handleAdminBoxClick(idx) {
  if (!adminRound2Boxes[idx]) return;
  const b = adminRound2Boxes[idx];

  if (b.isFlipped) {
    // Already revealed, remains open
    return;
  }

  // Admin can click and flip any number of boxes!
  b.isFlipped = true;

  if (typeof playMysterySound === 'function') {
    if (b.policy.type === 'efficiency_boost' || b.policy.type === 'advantageous') {
      playMysterySound('advantage');
    } else {
      playMysterySound('disadvantage');
    }
  }

  const isEff = b.policy.type === 'efficiency_boost' || b.policy.type === 'advantageous';
  if (isEff) {
    showToast(`⚡ Sector Efficiency Policy Revealed: ${b.policy.title}`, 'success', 2500);
  } else {
    showToast(`🌐 External Sector Policy Revealed: ${b.policy.title}`, 'info', 2500);
  }

  renderAdminRound2UI();
}

function handleAdminTurnTeamChange(teamId) {
  adminRound2SelectedTeamId = teamId;
  const team = (stateCraftData.teams || []).find(t => t.id === teamId);
  let stateName = 'Unassigned';
  if (team && team.allocatedStateId) {
    const s = (stateCraftData.states || []).find(x => x.id === team.allocatedStateId);
    if (s) stateName = s.name;
  }
  showToast(`Delegation switched to ${team ? team.name : 'Team'} (🏛️ ${stateName}). Opened boxes remain open!`, 'info', 2500);
  // Re-render UI to update team label while keeping already opened boxes open
  renderAdminRound2UI();
}

function handleAdminReshuffleCurrentSectorBoxes() {
  if (!adminRound2ActiveSector) return;
  initAdminRound2Boxes(adminRound2ActiveSector);
  if (typeof playMysterySound === 'function') playMysterySound('flip');
  showToast('🔄 All 10 Mystery Boxes re-sealed & reshuffled for this sector.', 'info');
  renderAdminRound2UI();
}

function handleAdminResetRound2Arena() {
  adminRound2ActiveSector = null;
  adminRound2Boxes = [];
  renderAdminRound2UI();
  showToast('Round 2 Arena reset. Please choose a sector above.', 'info');
}

async function handleAdminExecuteRound2Package() {
  if (!adminRound2SelectedTeamId) {
    showToast('Please select a state / delegation first.', 'error');
    return;
  }

  const chosenBoxes = adminRound2Boxes.filter(b => b.isFlipped);
  if (chosenBoxes.length === 0) {
    showToast('Please open at least one mystery box policy before applying.', 'error');
    return;
  }

  const team = (stateCraftData.teams || []).find(t => t.id === adminRound2SelectedTeamId);
  if (!team) {
    showToast('Selected delegation not found.', 'error');
    return;
  }

  const applyBtn = document.getElementById('btn-admin-apply-round2-package');
  if (applyBtn) {
    applyBtn.disabled = true;
    applyBtn.textContent = 'Executing Policy Package...';
  }

  const critMeta = (typeof CRITERIA_METADATA !== 'undefined' && CRITERIA_METADATA[adminRound2ActiveSector])
    ? CRITERIA_METADATA[adminRound2ActiveSector]
    : { title: adminRound2ActiveSector };

  const payload = {
    fromAdmin: true,
    teamId: team.id,
    criteriaKey: adminRound2ActiveSector,
    criteriaTitle: critMeta.title,
    chosenBoxes: chosenBoxes.map(b => ({
      boxNumber: b.boxNumber,
      policyId: b.policy.id,
      title: b.policy.title,
      type: b.policy.type,
      targetCriterion: b.policy.targetCriterion,
      criteriaPointsChange: b.policy.criteriaPointsChange,
      teamPointsChange: b.policy.teamPointsChange,
      description: b.policy.description
    }))
  };

  try {
    // 1. Submit selection
    const submitRes = await StateCraftAPI.submitRound2Choice(payload);
    if (!submitRes.success) {
      showToast(submitRes.error || 'Could not submit policy package', 'error');
      if (applyBtn) {
        applyBtn.disabled = false;
        applyBtn.textContent = '⚡ Apply Opened Policies to Delegation & State Criteria →';
      }
      return;
    }

    // 2. Apply impacts immediately
    const applyRes = await StateCraftAPI.applyRound2Impacts(team.id);
    if (applyRes.success) {
      if (typeof playMysterySound === 'function') playMysterySound('advantage');
      showToast(`🎉 Policy Package officially executed & applied to ${team.name}!`, 'success', 5000);
      
      // Refresh admin data and round2 state
      await refreshAdminData(false);
      await refreshRound2Data();

      // Reset arena boxes so Admin can take the turn for the next delegation
      initAdminRound2Boxes(adminRound2ActiveSector);
      renderAdminRound2UI();
    } else {
      showToast(applyRes.error || 'Could not apply impacts', 'error');
      if (applyBtn) {
        applyBtn.disabled = false;
        applyBtn.textContent = '⚡ Apply Opened Policies to Delegation & State Criteria →';
      }
    }
  } catch (err) {
    console.error('Execute error:', err);
    showToast('Failed to apply Round 2 policy package', 'error');
    if (applyBtn) {
      applyBtn.disabled = false;
      applyBtn.textContent = '⚡ Apply Opened Policies to Delegation & State Criteria →';
    }
  }
}

function renderAdminRound2CompletedTable() {
  const tbody = document.getElementById('admin-round2-completed-body');
  const countBadge = document.getElementById('admin-round2-completed-count');
  const emptyState = document.getElementById('admin-round2-empty-state');
  if (!tbody) return;

  const r = currentRound2State || { teamSelections: {} };
  const entries = Object.values(r.teamSelections || {});

  if (countBadge) {
    countBadge.textContent = `${entries.length} Delegation${entries.length === 1 ? '' : 's'} Completed`;
  }

  if (entries.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  tbody.innerHTML = entries.map(sel => {
    const teamScoreDelta = sel.netTeamScore || 0;
    const scoreSign = teamScoreDelta > 0 ? '+' : '';
    const scoreColor = teamScoreDelta >= 0 ? '#34D399' : '#F87171';

    const criteriaImpactsList = Object.entries(sel.criteriaImpacts || {}).map(([ck, delta]) => {
      const meta = (typeof CRITERIA_METADATA !== 'undefined' && CRITERIA_METADATA[ck]) ? CRITERIA_METADATA[ck] : { title: ck };
      const dSign = delta > 0 ? '+' : '';
      const dColor = delta >= 0 ? '#34D399' : '#F87171';
      return `<span style="display: inline-block; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; padding: 0.15rem 0.45rem; font-size: 0.72rem; margin: 0.1rem;">
        ${meta.title}: <strong style="color: ${dColor};">${dSign}${delta} pts</strong>
      </span>`;
    }).join(' ');

    const boxesSummary = (sel.chosenBoxes || []).map(b => {
      const isAdv = b.type === 'advantageous';
      const badgeStyle = isAdv 
        ? 'background: rgba(16, 185, 129, 0.18); border: 1px solid rgba(16, 185, 129, 0.4); color: #34D399;'
        : 'background: rgba(244, 63, 94, 0.18); border: 1px solid rgba(244, 63, 94, 0.4); color: #FDA4AF;';
      const tagLabel = isAdv ? '🟢 Advantage' : '🔴 Trade-off';
      const ptsText = (b.criteriaPointsChange > 0 ? '+' : '') + b.criteriaPointsChange + ' pts';

      return `
        <div style="margin-bottom: 0.45rem; padding: 0.45rem 0.65rem; border-radius: 6px; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255,255,255,0.06);">
          <div class="flex items-center justify-between" style="gap: 0.5rem; margin-bottom: 0.15rem;">
            <strong style="font-size: 0.78rem; color: #FFFFFF;">Box #${b.boxNumber}: ${escapeHtml(b.title)}</strong>
            <span style="font-size: 0.68rem; font-weight: 700; padding: 0.1rem 0.45rem; border-radius: 9999px; ${badgeStyle}">
              ${tagLabel} (${ptsText})
            </span>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); line-height: 1.35;">
            ${escapeHtml(b.description || '')}
          </div>
        </div>
      `;
    }).join('');

    const statusHtml = sel.applied
      ? `<span class="badge badge-emerald" style="font-size: 0.75rem;">✓ Applied</span><div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 0.2rem;">${sel.appliedAt || ''}</div>`
      : `<span class="badge badge-needs-attention" style="font-size: 0.75rem;">⏳ Pending Execution</span>`;

    return `
      <tr>
        <td>
          <div style="font-weight: 700; font-size: 0.95rem; color: #FFFFFF;">${escapeHtml(sel.teamName || sel.teamId)}</div>
          <div style="font-size: 0.78rem; color: #60A5FA;">🏛️ ${escapeHtml(sel.stateName || 'No State')}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.15rem;">${sel.submittedAt || ''}</div>
        </td>
        <td>
          <span class="badge badge-indigo" style="font-size: 0.8rem; font-weight: 700;">
            ${escapeHtml(sel.criteriaTitle || sel.criteriaKey)}
          </span>
        </td>
        <td style="max-width: 440px;">
          ${boxesSummary}
        </td>
        <td>
          <div style="margin-bottom: 0.35rem;">
            Score Impact: <strong style="font-size: 0.95rem; color: ${scoreColor};">${scoreSign}${teamScoreDelta} pts</strong>
          </div>
          <div>${criteriaImpactsList}</div>
        </td>
        <td>
          ${statusHtml}
        </td>
        <td>
          <div class="flex items-center gap-2" style="flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" onclick="openCustomScoreForTeam('${sel.teamId}')">
              Score...
            </button>
            <button class="btn btn-danger btn-sm" onclick="handleAdminResetTeamRound2('${sel.teamId}')" title="Reset this delegation's choices">
              Reset
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function handleAdminClearCompletedRound2() {
  if (!confirm('Are you sure you want to clear all completed Round 2 records?')) return;
  try {
    const res = await StateCraftAPI.resetRound2();
    if (res.success) {
      currentRound2State = res.round2;
      showToast('Completed Round 2 records cleared.', 'info');
      renderAdminRound2UI();
    }
  } catch (err) {
    showToast('Failed to clear records', 'error');
  }
}

async function handleAdminResetTeamRound2(teamId) {
  if (!confirm('Reset Round 2 selection for this delegation? They will be permitted to play again.')) return;
  try {
    const res = await StateCraftAPI.resetRound2(teamId);
    if (res.success) {
      currentRound2State = res.round2;
      showToast('Delegation Round 2 selection cleared.', 'info');
      renderAdminRound2UI();
    }
  } catch (err) {
    showToast('Failed to reset delegation selection', 'error');
  }
}

/* ==========================================================================
   ORGANISER / JUDGE DASHBOARD: INFRASTRUCTURE MARKET & STATE DEVELOPMENT
   ========================================================================== */

let adminMarketSearchQuery = '';
let adminMarketFilter = 'all';
let teamToResetMarket = null;
let resetAllMarketMode = false;
let adminCachedMarketConfig = null;

const ADMIN_CATEGORY_ICONS = {
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

const DEFAULT_DEV_CATEGORIES = [
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

function handleAdminMarketSearch(val) {
  adminMarketSearchQuery = (val || '').trim().toLowerCase();
  renderAdminMarketDashboard();
}

function setAdminMarketFilter(filter) {
  adminMarketFilter = filter;
  document.querySelectorAll('.admin-market-filter-btn').forEach(btn => {
    if (btn.dataset.filter === filter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  renderAdminMarketDashboard();
}

async function renderAdminMarketDashboard() {
  const container = document.getElementById('admin-market-teams-grid');
  if (!container) return;

  const teams = stateCraftData.teams || [];
  const states = stateCraftData.states || [];

  // Compute Overall Market KPIs
  let totalAssets = 0;
  let totalInvested = 0;
  let totalDevScore = 0;
  const categoryTotals = {};
  DEFAULT_DEV_CATEGORIES.forEach(c => categoryTotals[c] = 0);

  teams.forEach(t => {
    const purchased = t.purchasedInfrastructure || [];
    totalAssets += purchased.length;
    purchased.forEach(p => {
      totalInvested += (p.cost || 0);
    });
    totalDevScore += (t.developmentScore || 0);

    const catScores = t.categoryScores || {};
    DEFAULT_DEV_CATEGORIES.forEach(c => {
      categoryTotals[c] += (catScores[c] || 0);
    });
  });

  // Find most invested category
  let topCategory = '--';
  let topCategoryScore = -1;
  Object.entries(categoryTotals).forEach(([cat, score]) => {
    if (score > topCategoryScore && score > 0) {
      topCategoryScore = score;
      topCategory = `${cat} (+${score})`;
    }
  });

  const totalAssetsEl = document.getElementById('admin-market-total-assets');
  const totalInvestedEl = document.getElementById('admin-market-total-invested');
  const totalDevEl = document.getElementById('admin-market-total-dev');
  const topSectorEl = document.getElementById('admin-market-top-sector');

  if (totalAssetsEl) totalAssetsEl.textContent = totalAssets;
  if (totalInvestedEl) totalInvestedEl.textContent = totalInvested.toLocaleString();
  if (totalDevEl) totalDevEl.textContent = totalDevScore.toLocaleString();
  if (topSectorEl) topSectorEl.textContent = topCategory;

  // Filter teams based on search query and button filter
  const filteredTeams = teams.filter(team => {
    const state = states.find(s => s.id === team.allocatedStateId);
    const stateName = state ? state.name.toLowerCase() : '';
    const teamName = (team.name || '').toLowerCase();

    // Query match
    if (adminMarketSearchQuery) {
      const matchQuery = teamName.includes(adminMarketSearchQuery) || stateName.includes(adminMarketSearchQuery);
      if (!matchQuery) return false;
    }

    // Button filter
    const count = (team.purchasedInfrastructure || []).length;
    if (adminMarketFilter === 'with-assets' && count === 0) return false;
    if (adminMarketFilter === 'without-assets' && count > 0) return false;

    return true;
  });

  if (filteredTeams.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 2.5rem; color: var(--text-muted); grid-column: 1/-1;">
        No delegations matching filter criteria.
      </div>
    `;
    return;
  }

  container.innerHTML = filteredTeams.map(team => {
    const state = states.find(s => s.id === team.allocatedStateId);
    const stateName = state ? state.name : 'Unallocated State';
    const purchased = team.purchasedInfrastructure || [];
    const catScores = team.categoryScores || {};

    return `
      <div class="organizer-team-card fade-in" id="org-team-card-${team.id}">
        <!-- Team Card Header -->
        <div class="org-card-header">
          <div class="flex items-center gap-3">
            <div class="org-state-badge" style="background: ${state ? state.color || '#4F46E5' : '#334155'};">
              ${state ? state.name.substring(0, 2).toUpperCase() : '🏛️'}
            </div>
            <div>
              <div class="org-state-sub">ALLOCATED STATE &amp; DELEGATION</div>
              <h4 class="org-state-title">TEAM: ${escapeHtml(stateName)}</h4>
              <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.1rem;">
                Delegation Name: <strong style="color: #F8FAFC;">${escapeHtml(team.name)}</strong>
              </div>
            </div>
          </div>

          <!-- Points Display -->
          <div class="org-points-cluster">
            <div class="org-point-tile tile-avail">
              <span class="org-tile-label">Available Points:</span>
              <span class="org-tile-val">${(team.points !== undefined ? team.points : 0).toLocaleString()}</span>
            </div>
            <div class="org-point-tile tile-dev">
              <span class="org-tile-label">Development Score:</span>
              <span class="org-tile-val text-gain">${(team.developmentScore || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <!-- 11 Development Categories Grid -->
        <div class="org-sectors-section">
          <div class="org-section-heading">Category Scores:</div>
          <div class="org-category-grid">
            ${DEFAULT_DEV_CATEGORIES.map(cat => {
              const val = catScores[cat] || 0;
              const icon = ADMIN_CATEGORY_ICONS[cat] || '📊';
              return `
                <div class="org-cat-item ${val > 0 ? 'active' : ''}">
                  <span class="org-cat-name">${icon} ${escapeHtml(cat)}:</span>
                  <span class="org-cat-score">${val}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Purchased Infrastructure List -->
        <div class="org-purchased-section">
          <div class="flex items-center justify-between" style="margin-bottom: 0.6rem;">
            <div class="org-section-heading" style="margin-bottom: 0;">Purchased Infrastructure (${purchased.length}):</div>
            <button class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 0.2rem 0.6rem; color: #F87171; border-color: rgba(248, 113, 113, 0.3);" onclick="openResetTeamMarketModal('${team.id}')">
              🔄 Reset Team
            </button>
          </div>

          ${purchased.length === 0 ? `
            <div class="org-empty-purchased">No infrastructure purchased yet.</div>
          ` : `
            <div class="org-purchased-list">
              ${purchased.map(item => `
                <div class="org-purchased-item">
                  <span class="check-icon">✓</span>
                  <span class="item-name">${escapeHtml(item.name)}</span>
                  <span class="item-meta">
                    <span class="badge badge-indigo" style="font-size: 0.7rem; padding: 0.1rem 0.45rem;">${escapeHtml(item.category)}</span>
                    <span class="item-cost">💎 ${item.cost} pts</span>
                    <span class="item-bonus">📈 +${item.bonus} dev</span>
                    <span class="item-time">🕒 ${escapeHtml(item.purchasedAt || '')}</span>
                  </span>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// Market Configuration Editor (Admin)
async function openMarketConfigModal() {
  try {
    const res = await StateCraftAPI.fetchMarketConfig();
    if (!res || !res.items) {
      showToast('Could not load market configuration', 'error');
      return;
    }

    adminCachedMarketConfig = res.items;
    const tbody = document.getElementById('admin-config-items-table-body');
    if (!tbody) return;

    tbody.innerHTML = res.items.map((item, idx) => {
      const catIcon = ADMIN_CATEGORY_ICONS[item.category] || '🏷️';
      return `
        <tr>
          <td style="text-align: center; font-size: 1.5rem;">${item.icon || '🏗️'}</td>
          <td>
            <strong style="color: #F8FAFC;">${escapeHtml(item.name)}</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">
              ID: <code>${escapeHtml(item.id)}</code>
            </div>
          </td>
          <td>
            <span class="badge badge-indigo flex items-center gap-1" style="display: inline-flex;">
              <span>${catIcon}</span>
              <span>${escapeHtml(item.category)}</span>
            </span>
          </td>
          <td>
            <input type="number" class="form-input config-input-cost" data-idx="${idx}" value="${item.cost}" min="10" step="5" style="padding: 0.4rem 0.65rem; font-weight: 700; color: #F59E0B;">
          </td>
          <td>
            <input type="number" class="form-input config-input-bonus" data-idx="${idx}" value="${item.bonus}" min="10" step="5" style="padding: 0.4rem 0.65rem; font-weight: 700; color: #10B981;">
          </td>
        </tr>
      `;
    }).join('');

    document.getElementById('modal-admin-market-config').classList.add('active');
  } catch (err) {
    showToast('Failed to load market configuration: ' + err.message, 'error');
  }
}

function closeMarketConfigModal() {
  const modal = document.getElementById('modal-admin-market-config');
  if (modal) modal.classList.remove('active');
}

async function handleSaveMarketConfig() {
  if (!adminCachedMarketConfig) return;

  const costInputs = document.querySelectorAll('.config-input-cost');
  const bonusInputs = document.querySelectorAll('.config-input-bonus');

  costInputs.forEach(inp => {
    const idx = parseInt(inp.dataset.idx, 10);
    const val = parseInt(inp.value, 10) || 100;
    if (adminCachedMarketConfig[idx]) {
      adminCachedMarketConfig[idx].cost = val;
    }
  });

  bonusInputs.forEach(inp => {
    const idx = parseInt(inp.dataset.idx, 10);
    const val = parseInt(inp.value, 10) || 100;
    if (adminCachedMarketConfig[idx]) {
      adminCachedMarketConfig[idx].bonus = val;
    }
  });

  try {
    const res = await StateCraftAPI.updateMarketConfig(adminCachedMarketConfig);
    if (res.success) {
      showToast('Market prices and bonuses saved successfully!', 'success');
      closeMarketConfigModal();
      refreshAdminData(false);
    } else {
      showToast(res.error || 'Failed to save configuration', 'error');
    }
  } catch (err) {
    showToast('Failed to communicate with server', 'error');
  }
}

// Reset Market Holdings Modals & Actions
function openResetTeamMarketModal(teamId) {
  const team = (stateCraftData.teams || []).find(t => t.id === teamId);
  if (!team) return;

  teamToResetMarket = teamId;
  resetAllMarketMode = false;

  document.getElementById('reset-modal-title').textContent = `Reset Market: ${team.name}`;
  document.getElementById('reset-modal-prompt').innerHTML = `
    Are you sure you want to reset all infrastructure investments for <strong>${escapeHtml(team.name)}</strong>?<br>
    Their development score and category progress will be reset to 0.
  `;

  document.getElementById('modal-reset-team-market').classList.add('active');
}

function confirmResetAllMarket() {
  teamToResetMarket = null;
  resetAllMarketMode = true;

  document.getElementById('reset-modal-title').textContent = 'Reset Market for ALL Teams';
  document.getElementById('reset-modal-prompt').innerHTML = `
    ⚠️ <strong>Warning:</strong> This will reset all purchased infrastructure and development scores for <strong>all teams</strong> in the simulation back to 0.
  `;

  document.getElementById('modal-reset-team-market').classList.add('active');
}

function closeResetTeamMarketModal() {
  const modal = document.getElementById('modal-reset-team-market');
  if (modal) modal.classList.remove('active');
  teamToResetMarket = null;
  resetAllMarketMode = false;
}

async function executeMarketResetAction() {
  const refund = document.getElementById('reset-refund-checkbox').checked;
  const btn = document.getElementById('btn-confirm-market-reset');

  btn.disabled = true;
  btn.textContent = 'Resetting...';

  try {
    const targetTeamId = resetAllMarketMode ? null : teamToResetMarket;
    const res = await StateCraftAPI.resetMarket(targetTeamId, refund);

    if (res.success) {
      showToast(res.message || 'Market reset completed successfully', 'success');
      closeResetTeamMarketModal();
      await refreshAdminData(false);
    } else {
      showToast(res.error || 'Reset failed', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to server for reset', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm Reset';
  }
}


