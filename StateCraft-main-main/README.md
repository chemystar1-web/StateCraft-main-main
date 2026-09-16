# StateCraft — National Governance & Policy Simulation Platform

A full-stack, zero-dependency web simulation platform for governance and policy competitions, workshops, and educational hackathons.

---

## Key Features

### 1. Admin Portal (`http://localhost:8000/admin.html`)
- **Team Provisioning & State Allocation**:
  - Add teams with **Team Name**, **Access Password**, and assign any of the **28 States of India**.
  - Reallocate states, reset team passwords, or remove teams.
  - Allocation state is automatically pushed and updated on the participant's portal in real time.
- **28 States of India Master Matrix**:
  - Preloaded baseline data for all **28 official Indian states**: *Andhra Pradesh, Arunachal Pradesh, Assam, Bihar, Chhattisgarh, Goa, Gujarat, Haryana, Himachal Pradesh, Jharkhand, Karnataka, Kerala, Madhya Pradesh, Maharashtra, Manipur, Meghalaya, Mizoram, Nagaland, Odisha, Punjab, Rajasthan, Sikkim, Tamil Nadu, Telangana, Tripura, Uttar Pradesh, Uttarakhand, West Bengal*.
  - Filter by region (North, South, East, West, Central, Northeast) or search by state/capital name.
  - **Edit Predefined Values & Responsibilities**: Modify values, units, status pills, and administrative responsibilities for all 8 criteria:
    1. **Education** (Literacy rate, Higher Edu GER, School Infrastructure)
    2. **Healthcare** (NITI Health Index, IMR, Hospital Beds)
    3. **Infrastructure** (Road networks, Ports, Clean Power grids)
    4. **Population** (Total scale, density, urbanization)
    5. **Industrial Development** (Manufacturing GSDP, Ease of Doing Business, SEZs)
    6. **Law Enforcement** (Safety Index, Police ratio, Emergency response)
    7. **Per Capita Income** (NSDP per capita, economic growth)
    8. **State Debt** (Debt-to-GSDP ratio, fiscal deficit prudential limits)
- **Scoring & Point Allocation Ledger**:
  - Award or deduct points to teams (+10, +25, +50, +100, -10, or custom).
  - Categorize by evaluation pillars: *Policy Pitch, Fiscal Strategy, Crisis Response, Infrastructure Roadmap, Healthcare Reform, Law Enforcement, Penalties*.
  - Provide adjudicator remarks and track full historical ledgers per team.
  - Live Leaderboard with rank indicators.
- **Round 1 Rapid Response Buzzer Hub**:
  - Admin access control: Enable or lock the participant buzzer at will.
  - Participants cannot buzz before admin enablement.
  - Real-time arrival queue displaying exact chronological order (#1, #2, #3...), precise timestamps, and reaction latency.
  - **Display Order to Participants**: Admin toggle to reveal or hide the official standings from participant screens.
  - Quick scoring: Award bonus evaluation points (+10, +25, or custom) directly to the fastest buzzers.
  - One-click reset to clear clicks for the next question.

### 2. Participant Portal (`http://localhost:8000/participant.html`)
- **Round 1 Rapid Buzzer Console**:
  - Automatically locked until the Admin enables the round.
  - When unlocked: Vibrant 3D pulsating button with audio activation cues and Spacebar shortcut.
  - Immediate local lock and server verification prevents duplicate clicks.
  - Displays instant rank confirmation (#1, #2...) and response time.
  - Standings table automatically updates when Admin enables "Display Order to Participants".
- **Team Authentication**:
  - Login using the **Team Name** and **Password** allocated by the Admin.
  - Persistent session management across page refreshes.
- **Read-Only State Command Center**:
  - Allocated state crest, capital, and regional context.
  - Comprehensive view of all **8 governance criteria**: primary metrics, sub-values, performance badges, and strategic responsibilities.
  - **Strictly read-only**: Delegates cannot alter official criteria allocated by the Admin.
- **Live Team Score & Feedback History**:
  - Large live points counter that automatically pulses upon receiving points from Admin.
  - Transparent adjudicator feedback logs with timestamps, evaluation categories, and points delta.
- **Real-Time Synchronization**:
  - Powered by background polling and cross-tab `BroadcastChannel`. Any update made by the Admin (buzzer enablement, buzzer reveal, point awards, criteria alterations, or state reallocations) is reflected instantaneously on the participant's screen with alert notifications!

---

## Getting Started

### 1. Launch the Platform
Double-click `start_statecraft.bat` or run in terminal:
```bash
python server.py
```

Open in your browser:
- **Main Gateway**: [http://localhost:8000/](http://localhost:8000/)
- **Admin Portal**: [http://localhost:8000/admin.html](http://localhost:8000/admin.html)
- **Participant Portal**: [http://localhost:8000/participant.html](http://localhost:8000/participant.html)

### 2. Default Access Credentials

#### Admin Portal:
- **Passcode**: `akshita`

#### Sample Pre-Configured Teams (For Instant Testing):
| Team Name | Password | Allocated State | Initial Points |
|---|---|---|---|
| **Chanakya Strategists** | `pass123` | Maharashtra | 120 pts |
| **Team Garuda** | `garuda2026` | Karnataka | 105 pts |
| **Dharma Policy Cohort** | `dharma321` | Gujarat | 95 pts |

---

## Technical Stack & Architecture

- **Backend**: Python standard library (`http.server.ThreadingHTTPServer`, `urllib`, `json`) — zero external dependencies, ultra-lightweight, and persistent.
- **Frontend**: HTML5, Vanilla CSS3 (Deep Obsidian design system with glassmorphism), Modern JavaScript (ES6+).
- **Data Layer**: File-persisted JSON database (`data/statecraft_db.json`) with automated seed restoration (`data/default_states.json`).
