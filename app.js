/* ═══════════════════════════════════════════
   HABITFLOW — app.js
   Pure JavaScript, no frameworks
   LocalStorage-based persistence
═══════════════════════════════════════════ */

// ── CONSTANTS ──────────────────────────────
const STORAGE_KEYS = {
  USERS: 'hf_users',
  SESSION: 'hf_session',
  HABITS: 'hf_habits'       // prefix: hf_habits_<userId>
};

// ── STATE ───────────────────────────────────
let currentUser = null;     // { id, name, email }
let habits = [];            // array of habit objects
let selectedColor = '#22c55e';
let editingHabitId = null;
let currentView = 'dashboard';

// ── DATE HELPERS ────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0];
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function daysBetween(a, b) {
  return Math.abs((new Date(b) - new Date(a)) / 86400000);
}

function dateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getLastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// ── LOCAL STORAGE HELPERS ───────────────────
function getUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '{}');
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

function getHabitsKey(userId) {
  return `${STORAGE_KEYS.HABITS}_${userId}`;
}

function loadHabits() {
  if (!currentUser) return [];
  return JSON.parse(localStorage.getItem(getHabitsKey(currentUser.id)) || '[]');
}

function saveHabits() {
  if (!currentUser) return;
  localStorage.setItem(getHabitsKey(currentUser.id), JSON.stringify(habits));
}

function getSession() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION) || 'null');
}

function saveSession(user) {
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

// ── STREAK CALCULATOR ───────────────────────
function calculateStreak(completedDates) {
  if (!completedDates || completedDates.length === 0) return { current: 0, longest: 0 };

  const sorted = [...new Set(completedDates)].sort().reverse(); // newest first
  const todayStr = today();
  const yestStr = yesterday();

  // Current streak: must include today or yesterday to be "active"
  let current = 0;
  const startDate = sorted[0] === todayStr || sorted[0] === yestStr ? sorted[0] : null;

  if (startDate) {
    let check = new Date(startDate + 'T00:00:00');
    const sortedSet = new Set(sorted);
    while (true) {
      const ds = check.toISOString().split('T')[0];
      if (sortedSet.has(ds)) {
        current++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Longest streak
  const asc = [...new Set(completedDates)].sort();
  let longest = 1, tempLen = 1;
  for (let i = 1; i < asc.length; i++) {
    if (daysBetween(asc[i - 1], asc[i]) === 1) {
      tempLen++;
      longest = Math.max(longest, tempLen);
    } else {
      tempLen = 1;
    }
  }
  if (asc.length === 0) longest = 0;

  return { current, longest };
}

function completionRate(habit) {
  if (!habit.completedDates || habit.completedDates.length === 0) return 0;
  const created = new Date(habit.createdAt);
  const days = Math.max(1, Math.ceil((new Date() - created) / 86400000));
  return Math.round((habit.completedDates.length / days) * 100);
}

// ── AUTH ─────────────────────────────────────
function handleLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  err.textContent = '';

  if (!email || !password) { err.textContent = 'Please fill in all fields.'; return; }

  const users = getUsers();
  const user = Object.values(users).find(u => u.email === email && u.password === password);
  if (!user) { err.textContent = 'Invalid email or password.'; return; }

  loginUser(user);
}

function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const password = document.getElementById('signup-password').value;
  const err = document.getElementById('signup-error');
  err.textContent = '';

  if (!name || !email || !password) { err.textContent = 'Please fill in all fields.'; return; }
  if (password.length < 6) { err.textContent = 'Password must be at least 6 characters.'; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = 'Enter a valid email address.'; return; }

  const users = getUsers();
  if (Object.values(users).find(u => u.email === email)) {
    err.textContent = 'This email is already registered.'; return;
  }

  const newUser = {
    id: 'u_' + Date.now(),
    name, email, password,
    createdAt: today()
  };
  users[newUser.id] = newUser;
  saveUsers(users);
  loginUser(newUser);
}

function loginUser(user) {
  currentUser = { id: user.id, name: user.name, email: user.email };
  saveSession(currentUser);
  habits = loadHabits();
  renderApp();
}

function handleLogout() {
  clearSession();
  currentUser = null;
  habits = [];
  showScreen('auth-screen');
  switchPanel('login');
  // Reset inputs
  ['login-email','login-password','signup-name','signup-email','signup-password'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁'; }
}

// ── SCREEN / PANEL SWITCHING ─────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function switchPanel(name) {
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`${name}-panel`).classList.add('active');
}

function switchView(view, linkEl) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');
  // close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
  // render view
  renderCurrentView();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('theme-icon').textContent = isDark ? '🌙' : '☀';
  document.getElementById('theme-label').textContent = isDark ? 'Dark Mode' : 'Light Mode';
}

// ── MODAL ────────────────────────────────────
function openAddModal(habitId = null) {
  editingHabitId = habitId;
  document.getElementById('modal-error').textContent = '';

  if (habitId) {
    const h = habits.find(h => h.id === habitId);
    if (!h) return;
    document.getElementById('modal-title').textContent = 'Edit Habit';
    document.getElementById('habit-name-input').value = h.name;
    document.getElementById('habit-emoji-input').value = h.emoji || '';
    selectedColor = h.color || '#22c55e';
    document.getElementById('editing-habit-id').value = habitId;
  } else {
    document.getElementById('modal-title').textContent = 'New Habit';
    document.getElementById('habit-name-input').value = '';
    document.getElementById('habit-emoji-input').value = '';
    selectedColor = '#22c55e';
    document.getElementById('editing-habit-id').value = '';
  }

  // update color swatches UI
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('selected', s.dataset.color === selectedColor);
  });

  document.getElementById('habit-modal').classList.add('open');
  setTimeout(() => document.getElementById('habit-name-input').focus(), 50);
}

function closeAddModal() {
  document.getElementById('habit-modal').classList.remove('open');
  editingHabitId = null;
}

function closeModal(e) {
  if (e.target.id === 'habit-modal') closeAddModal();
}

function setEmoji(e) {
  document.getElementById('habit-emoji-input').value = e;
}

function selectColor(el) {
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  selectedColor = el.dataset.color;
}

// ── HABIT CRUD ───────────────────────────────
function saveHabit() {
  const name = document.getElementById('habit-name-input').value.trim();
  const emoji = document.getElementById('habit-emoji-input').value.trim() || '🎯';
  const err = document.getElementById('modal-error');
  err.textContent = '';

  if (!name) { err.textContent = 'Please enter a habit name.'; return; }
  if (name.length > 50) { err.textContent = 'Name too long (max 50 chars).'; return; }

  const editId = document.getElementById('editing-habit-id').value;

  if (editId) {
    // Edit existing
    const idx = habits.findIndex(h => h.id === editId);
    if (idx !== -1) {
      habits[idx].name = name;
      habits[idx].emoji = emoji;
      habits[idx].color = selectedColor;
    }
    showToast('Habit updated ✓', 'success');
  } else {
    // New habit
    const newHabit = {
      id: 'h_' + Date.now(),
      name, emoji,
      color: selectedColor,
      completedDates: [],
      createdAt: today()
    };
    habits.push(newHabit);
    showToast('Habit created 🎉', 'success');
  }

  saveHabits();
  closeAddModal();
  renderCurrentView();
}

function deleteHabit(habitId) {
  if (!confirm('Delete this habit? All data will be lost.')) return;
  habits = habits.filter(h => h.id !== habitId);
  saveHabits();
  renderCurrentView();
  showToast('Habit deleted', 'error');
}

function markDone(habitId) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;
  const t = today();
  if (habit.completedDates.includes(t)) return; // already done

  habit.completedDates.push(t);
  saveHabits();

  const streak = calculateStreak(habit.completedDates);
  if (streak.current > 1) {
    showToast(`🔥 ${streak.current} day streak! Keep going!`, 'success');
  } else {
    showToast(`✓ "${habit.name}" done for today!`, 'success');
  }

  renderCurrentView();
}

// ── RENDER ENGINE ────────────────────────────
function renderApp() {
  showScreen('app-screen');

  // Sidebar user info
  document.getElementById('sidebar-user').textContent = `${currentUser.name} · ${currentUser.email}`;

  renderCurrentView();
}

function renderCurrentView() {
  switch (currentView) {
    case 'dashboard': renderDashboard(); break;
    case 'habits': renderHabitsList(); break;
    case 'calendar': renderCalendarView(); break;
    case 'stats': renderStats(); break;
  }
}

// ─── DASHBOARD ──────────────────────────────
function renderDashboard() {
  // Greeting
  document.getElementById('dashboard-greeting').textContent =
    `${getGreeting()}, ${currentUser.name.split(' ')[0]}!`;
  document.getElementById('dashboard-date').textContent =
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Overview stats
  const t = today();
  const doneToday = habits.filter(h => h.completedDates.includes(t)).length;
  const total = habits.length;
  const bestStreak = habits.reduce((max, h) => Math.max(max, calculateStreak(h.completedDates).current), 0);
  const totalCompletions = habits.reduce((sum, h) => sum + h.completedDates.length, 0);

  document.getElementById('overview-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Habits</div>
      <div class="stat-value">${total}</div>
      <div class="stat-sub">being tracked</div>
    </div>
    <div class="stat-card completed">
      <div class="stat-label">Done Today</div>
      <div class="stat-value">${doneToday}<span style="font-size:1rem;color:var(--text-muted)">/${total}</span></div>
      <div class="stat-sub">${total > 0 ? Math.round((doneToday/total)*100) : 0}% complete</div>
    </div>
    <div class="stat-card streak">
      <div class="stat-label">Best Active Streak</div>
      <div class="stat-value">🔥 ${bestStreak}</div>
      <div class="stat-sub">days in a row</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Completions</div>
      <div class="stat-value">${totalCompletions}</div>
      <div class="stat-sub">all time</div>
    </div>
  `;

  // Today's habits
  const container = document.getElementById('today-habits-list');
  if (habits.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🌱</div>
        <div class="empty-title">No habits yet</div>
        <div class="empty-sub">Click "+ New Habit" to get started</div>
      </div>`;
    return;
  }

  container.innerHTML = habits.map(h => {
    const done = h.completedDates.includes(t);
    const streak = calculateStreak(h.completedDates);
    const rate = completionRate(h);
    return `
      <div class="habit-card ${done ? 'completed' : ''}" style="--habit-color:${h.color}">
        <div class="habit-card-top">
          <div class="habit-emoji">${h.emoji || '🎯'}</div>
          <div class="habit-info">
            <div class="habit-name">${escHtml(h.name)}</div>
            <div class="habit-streak">🔥 ${streak.current} day streak</div>
          </div>
        </div>
        <div class="habit-progress-bar">
          <div class="habit-progress-fill" style="width:${rate}%"></div>
        </div>
        <div class="habit-actions">
          <button class="btn-done ${done ? 'done-state' : ''}"
            onclick="markDone('${h.id}')"
            ${done ? 'disabled' : ''}>
            ${done ? '✓ Done' : 'Mark Done'}
          </button>
          <button class="btn-icon" onclick="openAddModal('${h.id}')" title="Edit">✎</button>
          <button class="btn-icon delete" onclick="deleteHabit('${h.id}')" title="Delete">✕</button>
        </div>
      </div>`;
  }).join('');

  // Weekly chart
  renderWeeklyChart();
}

function renderWeeklyChart() {
  const days = getLastNDays(7);
  const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const total = habits.length || 1;

  const counts = days.map(d => habits.filter(h => h.completedDates.includes(d)).length);
  const maxCount = Math.max(...counts, 1);

  const container = document.getElementById('weekly-chart');
  container.innerHTML = days.map((d, i) => {
    const count = counts[i];
    const pct = Math.round((count / maxCount) * 100);
    const dayName = new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    return `
      <div class="week-bar-wrap" title="${d}: ${count}/${total} habits">
        <div class="week-count">${count}</div>
        <div class="week-bar-inner">
          <div class="week-bar" style="height:${Math.max(pct, 5)}%"></div>
        </div>
        <div class="week-label">${dayName}</div>
      </div>`;
  }).join('');
}

// ─── HABITS LIST ────────────────────────────
function renderHabitsList() {
  const container = document.getElementById('habits-list');
  if (habits.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">No habits yet</div>
        <div class="empty-sub">Start building your routine!</div>
      </div>`;
    return;
  }

  const t = today();
  container.innerHTML = habits.map(h => {
    const done = h.completedDates.includes(t);
    const streak = calculateStreak(h.completedDates);
    const rate = completionRate(h);
    return `
      <div class="habit-row" style="--habit-color:${h.color}">
        <div class="habit-row-emoji">${h.emoji || '🎯'}</div>
        <div class="habit-row-info">
          <div class="habit-row-name">${escHtml(h.name)}</div>
          <div class="habit-row-meta">
            <span class="meta-chip streak">🔥 ${streak.current} day streak</span>
            <span class="meta-chip">📅 Best: ${streak.longest}</span>
            <span class="meta-chip rate">✓ ${rate}% rate</span>
            <span class="meta-chip">📊 ${h.completedDates.length} total</span>
          </div>
        </div>
        <div class="habit-row-actions">
          <button class="btn-done ${done ? 'done-state' : ''}"
            style="${!done ? 'background:'+h.color : ''}"
            onclick="markDone('${h.id}')"
            ${done ? 'disabled' : ''}>
            ${done ? '✓ Done' : 'Mark Done'}
          </button>
          <button class="btn-icon" onclick="openAddModal('${h.id}')">✎</button>
          <button class="btn-icon delete" onclick="deleteHabit('${h.id}')">✕</button>
        </div>
      </div>`;
  }).join('');
}

// ─── CALENDAR VIEW ───────────────────────────
function renderCalendarView() {
  const sel = document.getElementById('calendar-habit-select');
  sel.innerHTML = habits.map(h =>
    `<option value="${h.id}">${h.emoji || '🎯'} ${escHtml(h.name)}</option>`
  ).join('');
  renderCalendar();
}

function renderCalendar() {
  const habitId = document.getElementById('calendar-habit-select').value;
  const habit = habits.find(h => h.id === habitId);
  const container = document.getElementById('calendar-container');

  if (!habit) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🗓</div><div class="empty-title">No habits to show</div></div>`;
    return;
  }

  const days = getLastNDays(30);
  const t = today();
  const doneSet = new Set(habit.completedDates);

  // Pad start to align with day of week
  const firstDay = new Date(days[0] + 'T00:00:00').getDay(); // 0=Sun
  const paddingDays = (firstDay + 6) % 7; // Monday-first grid

  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  let html = `
    <div class="calendar-legend">
      <div class="legend-item"><div class="legend-dot" style="background:var(--green-soft);border:1px solid var(--accent)"></div> Completed</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--red-soft);border:1px solid var(--red)"></div> Missed</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--bg-input)"></div> Future</div>
    </div>
    <div class="calendar-grid">
      ${dayLabels.map(d => `<div class="cal-day-label">${d}</div>`).join('')}
      ${Array(paddingDays).fill('<div class="cal-day empty"></div>').join('')}
      ${days.map(d => {
        const isFuture = d > t;
        const isDone = doneSet.has(d);
        const isToday = d === t;
        const dayNum = new Date(d + 'T00:00:00').getDate();
        let cls = 'cal-day ';
        if (isFuture) cls += 'future';
        else if (isDone) cls += 'done';
        else cls += 'missed';
        if (isToday) cls += ' today';
        return `<div class="${cls}" title="${d}">${dayNum}</div>`;
      }).join('')}
    </div>`;

  container.innerHTML = html;
}

// ─── STATS VIEW ──────────────────────────────
function renderStats() {
  const container = document.getElementById('stats-container');
  if (habits.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">No habits yet</div><div class="empty-sub">Add habits to see your statistics</div></div>`;
    return;
  }

  const t = today();
  container.innerHTML = `<div class="stats-grid">${
    habits.map(h => {
      const streak = calculateStreak(h.completedDates);
      const rate = completionRate(h);
      const total = h.completedDates.length;
      return `
        <div class="stats-habit-card" style="--habit-color:${h.color}">
          <div class="stats-card-header">
            <div class="stats-emoji">${h.emoji || '🎯'}</div>
            <div class="stats-name">${escHtml(h.name)}</div>
          </div>
          <div class="stats-row-inner">
            <div class="stat-mini">
              <div class="stat-mini-val orange">🔥${streak.current}</div>
              <div class="stat-mini-label">Current</div>
            </div>
            <div class="stat-mini">
              <div class="stat-mini-val orange">${streak.longest}</div>
              <div class="stat-mini-label">Best</div>
            </div>
            <div class="stat-mini">
              <div class="stat-mini-val green">${total}</div>
              <div class="stat-mini-label">Total Done</div>
            </div>
          </div>
          <div class="progress-row">
            <div class="progress-label">
              <span>Completion Rate</span>
              <span>${rate}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:${rate}%"></div>
            </div>
          </div>
          <div style="margin-top:10px;font-size:0.75rem;color:var(--text-muted)">
            Started: ${dateLabel(h.createdAt)} · ${h.completedDates.includes(t) ? '<span style="color:var(--accent)">✓ Done today</span>' : '<span style="color:var(--red)">⏳ Not done today</span>'}
          </div>
        </div>`;
    }).join('')
  }</div>`;
}

// ── UTILITIES ────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── KEYBOARD SHORTCUTS ────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAddModal();
  if (e.key === 'Enter' && document.getElementById('habit-modal').classList.contains('open')) {
    saveHabit();
  }
});

// ── INIT ─────────────────────────────────────
(function init() {
  const session = getSession();
  if (session && session.id) {
    const users = getUsers();
    const user = users[session.id];
    if (user) {
      loginUser(user);
      return;
    }
  }
  showScreen('auth-screen');
})();
