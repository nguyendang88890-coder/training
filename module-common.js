// ===== SHARED MODULE LOGIC =====

function getUsersDB() {
  let users = JSON.parse(localStorage.getItem('wmt_users_db') || 'null');
  if (!users) {
    // Seed local-only defaults — do NOT push to Firebase (would overwrite real registered users)
    users = {
      admin:   { password: 'wmt2026',  role: 'admin',   createdAt: new Date().toISOString() },
      trainee: { password: 'train123', role: 'trainee', createdAt: new Date().toISOString() }
    };
    localStorage.setItem('wmt_users_db', JSON.stringify(users));
  }
  if (!users.admin) {
    users.admin = { password: 'wmt2026', role: 'admin', createdAt: new Date().toISOString() };
    localStorage.setItem('wmt_users_db', JSON.stringify(users));
  }

  // ── Field migration: add new fields to existing accounts (local only) ───────
  // Only updates localStorage. Firebase push is handled separately by
  // adminPushUserMigration() which is called by admin after syncFromFirebase().
  const FIELD_DEFAULTS = {
    isLeader:   false,
    leaderName: '',
    testGroup:  'auto',
  };
  let migrated = false;
  Object.values(users).forEach(u => {
    Object.entries(FIELD_DEFAULTS).forEach(([field, def]) => {
      if (!(field in u)) { u[field] = def; migrated = true; }
    });
  });
  if (migrated) localStorage.setItem('wmt_users_db', JSON.stringify(users));

  return users;
}

// ── Admin-only: patch missing fields per-user on Firebase ────────────────────
// Uses FDB.ref('users/{uname}').update({field: default}) for each user that
// is missing a field — NEVER calls set() on the entire users node, so existing
// data on Firebase is never overwritten or deleted.
function adminPushUserMigration() {
  if (!window.FDB) return;
  const FIELD_DEFAULTS = { isLeader: false, leaderName: '', testGroup: 'auto' };
  const users = JSON.parse(localStorage.getItem('wmt_users_db') || '{}');
  if (!Object.keys(users).length) return;

  Object.entries(users).forEach(([uname, u]) => {
    const patch = {};
    Object.entries(FIELD_DEFAULTS).forEach(([field, def]) => {
      if (!(field in u)) { patch[field] = def; u[field] = def; }
    });
    if (Object.keys(patch).length) {
      // update() merges — does NOT replace the whole user object
      window.FDB.ref('users/' + uname).update(patch)
        .catch(err => console.warn('[WMT] migration patch failed for', uname, err.message));
    }
  });

  // Reflect patched defaults in localStorage as well
  localStorage.setItem('wmt_users_db', JSON.stringify(users));
  console.info('[WMT] adminPushUserMigration: patched missing fields via per-user update().');
}

// Auth guard
(function() {
  const user = localStorage.getItem('wmt_user');
  const users = getUsersDB();
  if (!user || !users[user]) {
    window.location.href = 'index.html';
  }
})();

function getProgress() {
  const user = localStorage.getItem('wmt_user') || 'guest';
  return JSON.parse(localStorage.getItem('wmt_progress_' + user) || '{}');
}

function saveProgress(data) {
  const user = localStorage.getItem('wmt_user') || 'guest';
  dbWrite('wmt_progress_' + user, JSON.stringify(data));
}

function getQuizResult(username, moduleId) {
  return JSON.parse(localStorage.getItem(`wmt_quiz_${username}_m${moduleId}`) || 'null');
}
function saveQuizResult(username, moduleId, data) {
  dbWrite(`wmt_quiz_${username}_m${moduleId}`, JSON.stringify(data));
}
function resetQuizResult(username, moduleId) {
  dbRemove(`wmt_quiz_${username}_m${moduleId}`);
}

function markModuleComplete(moduleId) {
  const user   = localStorage.getItem('wmt_user') || '';
  const result = getQuizResult(user, moduleId);
  const p      = getProgress();
  const score  = result ? result.score : p[`module${moduleId}_score`];

  if (score === undefined || score === null) {
    alert('⚠️ You must complete the module quiz before marking this module as complete.');
    return;
  }
  if (score < 60) {
    alert(`⚠️ You need to score at least 60% on the quiz to complete this module.\nYour score: ${score}%\n\nPlease contact admin to retake the quiz.`);
    return;
  }

  p[`module${moduleId}_done`] = true;
  saveProgress(p);
  document.getElementById('markCompleteBtn').style.display = 'none';
  document.getElementById('completedCheck').style.display = 'flex';
}

function checkCompleted(moduleId) {
  const p = getProgress();
  if (p[`module${moduleId}_done`]) {
    const btn = document.getElementById('markCompleteBtn');
    const chk = document.getElementById('completedCheck');
    if (btn) btn.style.display = 'none';
    if (chk) chk.style.display = 'flex';
  }
}

function doLogout() {
  localStorage.removeItem('wmt_user');
  window.location.href = 'index.html';
}

function openProfileModal() {
  const existing = document.getElementById('profileModal');
  if (existing) { existing.classList.add('show'); return; }
  const user  = localStorage.getItem('wmt_user') || '';
  const users = getUsersDB();
  const u     = users[user] || {};
  const modal = document.createElement('div');
  modal.id        = 'profileModal';
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:400px;">
      <h3>👤 My Profile</h3>
      <div class="form-group">
        <label>Username</label>
        <input type="text" value="${user}" disabled style="opacity:.45;cursor:not-allowed;">
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="pmEmail" value="${u.email||''}" placeholder="your@email.com">
      </div>
      <div class="form-group">
        <label>Full Name</label>
        <input type="text" id="pmFullName" value="${u.fullName||''}" placeholder="Your full name">
      </div>
      <div class="success-msg" id="pmSuccess" style="display:none;margin-top:6px;">✓ Saved!</div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="document.getElementById('profileModal').classList.remove('show')">Close</button>
        <button class="btn btn-primary"   onclick="saveProfileModal()">Save</button>
      </div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('pmEmail').focus(), 100);
}

function saveProfileModal() {
  const user  = localStorage.getItem('wmt_user');
  const users = getUsersDB();
  if (!users[user]) return;
  const email    = document.getElementById('pmEmail').value.trim();
  const fullName = document.getElementById('pmFullName').value.trim();
  users[user].email    = email;
  users[user].fullName = fullName;
  // Per-user update — never overwrites other users' data
  localStorage.setItem('wmt_users_db', JSON.stringify(users));
  if (window.FDB) {
    window.FDB.ref('users/' + user).update({ email, fullName })
      .catch(e => console.warn('[WMT] saveProfileModal Firebase error:', e.message));
  }
  const s = document.getElementById('pmSuccess');
  s.style.display = 'block';
  setTimeout(() => { s.style.display = 'none'; }, 2000);
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

function updateSidebarProgress() {
  const p = getProgress();
  for (let i = 1; i <= 7; i++) {
    const badge = document.getElementById(`badge-m${i}`);
    const navItem = document.getElementById(`nav-m${i}`);
    if (badge && p[`module${i}_done`]) {
      badge.textContent = '✓';
      badge.style.background = 'rgba(0,214,143,0.15)';
      badge.style.color = 'var(--success)';
      if (navItem) navItem.classList.add('completed');
    }
  }
}

// ===== ANSWER DECODER =====
function _ans(q) { return parseInt(atob(q._c)); }

// ===== QUIZ ENGINE =====
class ModuleQuiz {
  constructor(moduleId, questions) {
    this.moduleId = moduleId;
    this.questions = questions;
    this.current = 0;
    this.answers = new Array(questions.length).fill(null);
    this.locked = false;
    this.p = getProgress();
  }

  render() {
    const user  = localStorage.getItem('wmt_user') || '';
    const saved = getQuizResult(user, this.moduleId);
    if (saved) {
      this.answers = saved.answers;
      this.showLockedResult(saved);
      return;
    }
    // Fallback: quiz submitted before lock feature existed — check progress data
    const p = getProgress();
    if (p[`module${this.moduleId}_done`]) {
      this.showLockedLegacy(p[`module${this.moduleId}_score`] ?? 0);
      return;
    }
    this.renderQuestion(0);
    this.renderDots();
  }

  _lockBanner(subtitle) {
    return `<div style="background:rgba(100,150,255,0.07);border:1px solid rgba(100,150,255,0.25);border-radius:10px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:1.4rem;">🔒</span>
      <div>
        <div style="font-weight:700;color:#6496ff;font-size:0.9rem;">Quiz Submitted</div>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:3px;">${subtitle}</div>
      </div>
    </div>`;
  }

  _showResult(score, correctStr) {
    const result  = document.getElementById('quizResult');
    const scoreEl = document.getElementById('quizScore');
    const dots    = document.getElementById('quizDots');
    const nav     = document.getElementById('quizNavBottom');
    if (dots) dots.innerHTML = '';
    if (nav)  nav.innerHTML  = '';
    result.classList.add('show');
    scoreEl.textContent = correctStr;
    scoreEl.className   = `result-score ${score >= 60 ? 'pass' : 'fail'}`;
    document.getElementById('quizResultMsg').textContent = score >= 60
      ? '🎉 Great job! Module marked as complete.'
      : '📚 Review the material. Contact admin to retake the quiz.';
  }

  showLockedResult(saved) {
    document.getElementById('quizContainer').innerHTML =
      this._lockBanner(`Submitted at: ${new Date(saved.submittedAt).toLocaleString('en-GB')} &nbsp;·&nbsp; Contact admin to retake this quiz.`) +
      this.buildReviewHTML();
    this._showResult(saved.score, `${saved.correct}/${saved.total} — ${saved.score}%`);
  }

  showLockedLegacy(score) {
    document.getElementById('quizContainer').innerHTML =
      this._lockBanner('Contact admin to retake this quiz.');
    this._showResult(score, `${score}%`);
  }

  buildReviewHTML() {
    return `<div class="review-section">
      <h3 class="review-title">📋 Answer Review</h3>
      ${this.questions.map((q, i) => {
        const userAns   = this.answers[i];
        const isCorrect = userAns === _ans(q);
        return `<div class="review-item ${isCorrect ? 'correct' : 'wrong'}">
          <div class="review-q">Q${i+1}. ${q.q}</div>
          <ul class="review-opts">
            ${q.opts.map((opt, oi) => {
              let cls = '';
              if (oi === _ans(q)) cls = 'review-correct';
              else if (oi === userAns && !isCorrect) cls = 'review-wrong';
              return `<li class="review-opt ${cls}">
                <span class="review-letter">${String.fromCharCode(65+oi)}</span>
                ${opt}${oi === _ans(q) ? ' ✓' : (oi === userAns && !isCorrect ? ' ✗' : '')}
              </li>`;
            }).join('')}
          </ul>
          ${q.explain ? `<div class="review-explain">💡 ${q.explain}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
  }

  renderQuestion(idx) {
    this.current = idx;
    const q = this.questions[idx];
    const container = document.getElementById('quizContainer');
    const answered = this.answers[idx] !== null;

    container.innerHTML = `
      <div class="quiz-question animate-in">
        <div class="question-text">Q${idx+1}. ${q.q}</div>
        <ul class="options-list">
          ${q.opts.map((opt, oi) => {
            let cls = '';
            if (answered) {
              if (oi === _ans(q)) cls = 'correct';
              else if (oi === this.answers[idx]) cls = 'wrong';
            } else if (oi === this.answers[idx]) cls = 'selected';
            return `<li class="option-item ${cls}" onclick="${answered ? '' : `quiz.select(${oi})`}">
              <span class="option-letter">${String.fromCharCode(65+oi)}</span>
              ${opt}
            </li>`;
          }).join('')}
        </ul>
        ${answered ? `<div class="feedback-box show ${this.answers[idx] === _ans(q) ? 'correct' : 'wrong'}">
          ${this.answers[idx] === _ans(q) ? '✓ Correct! Well done.' : `✗ Incorrect. The correct answer is: ${q.opts[_ans(q)]}`}
          ${q.explain ? `<div class="explain-text">💡 ${q.explain}</div>` : ''}
        </div>` : ''}
      </div>
      <div class="quiz-nav">
        <button class="btn btn-secondary" onclick="quiz.prev()" ${idx === 0 ? 'disabled' : ''}>← Prev</button>
        <span class="quiz-counter">${idx+1} / ${this.questions.length}</span>
        ${idx < this.questions.length - 1
          ? `<button class="btn btn-secondary" onclick="quiz.next()" ${this.answers[idx] === null ? 'disabled' : ''}>Next →</button>`
          : `<button class="btn btn-primary" onclick="quiz.submit()" ${this.answers.includes(null) ? 'disabled' : ''}>Submit Quiz</button>`
        }
      </div>`;
    this.renderDots();
  }

  select(optIdx) {
    if (this.answers[this.current] !== null) return;
    this.answers[this.current] = optIdx;
    this.renderQuestion(this.current);
  }

  prev() { if (this.current > 0) this.renderQuestion(this.current - 1); }
  next() { if (this.current < this.questions.length - 1) this.renderQuestion(this.current + 1); }

  renderDots() {
    const dots = document.getElementById('quizDots');
    if (!dots) return;
    dots.innerHTML = this.questions.map((q, i) => {
      let cls = i === this.current ? 'current' : '';
      if (this.answers[i] !== null) {
        cls = this.answers[i] === _ans(q) ? 'correct' : 'wrong';
      }
      return `<div class="q-dot ${cls}"></div>`;
    }).join('');
  }

  submit() {
    let correct = 0;
    this.answers.forEach((a, i) => { if (a === _ans(this.questions[i])) correct++; });
    const score = Math.round((correct / this.questions.length) * 100);

    const user = localStorage.getItem('wmt_user') || '';
    saveQuizResult(user, this.moduleId, {
      submittedAt: new Date().toISOString(),
      score, correct, total: this.questions.length,
      answers: this.answers
    });

    const passed = score >= 60;
    const p = getProgress();
    p[`module${this.moduleId}_score`] = score;
    if (passed) p[`module${this.moduleId}_done`] = true;
    saveProgress(p);

    const result  = document.getElementById('quizResult');
    const scoreEl = document.getElementById('quizScore');
    result.classList.add('show');
    scoreEl.textContent = `${correct}/${this.questions.length} — ${score}%`;
    scoreEl.className   = `result-score ${passed ? 'pass' : 'fail'}`;

    document.getElementById('quizResultMsg').textContent = passed
      ? '🎉 Great job! Module marked as complete.'
      : `⚠️ You scored ${score}%. You need at least 60% to complete this module. Contact admin to retake the quiz.`;

    const btn = document.getElementById('markCompleteBtn');
    const chk = document.getElementById('completedCheck');
    if (passed) {
      if (btn) btn.style.display = 'none';
      if (chk) chk.style.display = 'flex';
    }
    if (chk) chk.style.display = 'flex';

    updateSidebarProgress();
    document.getElementById('quizContainer').innerHTML = this.buildReviewHTML();
    document.getElementById('quizNavBottom').innerHTML = '';
  }
}

// ===== READING PROGRESS BAR =====
document.addEventListener('DOMContentLoaded', function() {
  if (!document.getElementById('quizContainer')) return;
  const bar = document.createElement('div');
  bar.className = 'reading-progress';
  bar.innerHTML = '<div class="reading-progress-fill" id="readingFill"></div>';
  document.body.prepend(bar);
  const fill = document.getElementById('readingFill');
  window.addEventListener('scroll', function() {
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    fill.style.width = docH > 0 ? Math.min(100, (window.scrollY / docH) * 100) + '%' : '0%';
  }, { passive: true });
});

// Sidebar HTML snippet generator
function getSidebarHTML(activeModule) {
  const modules = [
    { id: 1, icon: '📦', title: 'Products',            file: 'module1.html' },
    { id: 2, icon: '📋', title: 'Trading Rules',       file: 'module2.html' },
    { id: 3, icon: '🏆', title: 'Profit & Payouts',    file: 'module3.html' },
    { id: 4, icon: '💳', title: 'Payment Methods',     file: 'module4.html' },
    { id: 5, icon: '💰', title: 'Financial Products',  file: 'module5.html' },
    { id: 6, icon: '🤝', title: 'Introducing Partner', file: 'module6.html' },
    { id: 7, icon: '⚖️', title: 'Compliance & Risk',   file: 'module7.html' }
  ];
  const user    = localStorage.getItem('wmt_user') || 'Trainee';
  const users   = getUsersDB();
  const udata   = users[user] || {};
  const isAdmin = udata.role === 'admin';
  const isMod   = udata.role === 'mod';
  const isLeader = udata.isLeader === true;

  // Pre-compute role display string to avoid IIFE inside template literal
  let userRoleDisplay;
  if (isAdmin) {
    userRoleDisplay = 'Administrator';
  } else if (isMod && isLeader) {
    userRoleDisplay = '🛡️ Moderator · 🏆 Leader';
  } else if (isMod) {
    userRoleDisplay = '🛡️ Moderator';
  } else if (isLeader) {
    const dept = udata.department || '';
    userRoleDisplay = dept ? `🏆 Leader · ${dept}` : '🏆 Team Leader';
  } else {
    const dept  = udata.department || '';
    const pos   = udata.position   || '';
    const isOld = (udata.employeeType || 'new') === 'old';
    const parts = [dept, pos].filter(Boolean);
    if (!isOld) parts.push('Trainee');
    userRoleDisplay = parts.length ? parts.join(' · ') : (isOld ? 'Existed Employee' : 'Trainee');
  }

  const examData  = JSON.parse(localStorage.getItem('wmt_exam_' + user) || '{}');
  const examPassed = examData.passed || false;
  const iv        = JSON.parse(localStorage.getItem('wmt_interview_' + user) || 'null');
  const ivStatus  = !iv ? 'BOOK' : ({ pending:'⏳', confirmed:'✅', completed:'🏆', cancelled:'↺' }[iv.status] || '⏳');
  return `
    <div class="sidebar-header">
      <div class="sidebar-logo">WeMasterTrade</div>
      <div class="sidebar-subtitle">Sales Training Portal</div>
    </div>
    <div class="sidebar-user">
      <div class="user-avatar">${user[0].toUpperCase()}</div>
      <div class="user-info">
        <div class="user-name">${user}</div>
        <div class="user-role">${userRoleDisplay}</div>
      </div>
    </div>
    ${(!isAdmin && !isMod) ? `<button class="sidebar-edit-profile" onclick="openProfileModal()">✎ Edit Profile</button>` : ''}
    <nav class="sidebar-nav">
      <div class="nav-section-title">Training Modules</div>
      <a href="index.html" class="nav-item"><span class="nav-icon">🏠</span> Dashboard</a>
      <a href="about.html" class="nav-item ${activeModule === 'about' ? 'active' : ''}"><span class="nav-icon">🏢</span> About WMT <span style="font-size:0.6rem;font-weight:700;background:rgba(255,61,113,0.18);color:#ff6b8a;border:1px solid rgba(255,61,113,0.35);border-radius:4px;padding:1px 5px;margin-left:4px;vertical-align:middle;white-space:nowrap;">IMPORTANT</span></a>
      ${modules.map(m => `
        <a href="${m.file}" class="nav-item ${m.id === activeModule ? 'active' : ''}" id="nav-m${m.id}">
          <span class="nav-icon">${m.icon}</span> <span>${m.title}</span>
          <span class="nav-badge" id="badge-m${m.id}">M${m.id}</span>
        </a>`).join('')}
      <div class="nav-section-title">Assessment</div>
      <a href="exam.html" class="nav-item ${activeModule === 'exam' ? 'active' : ''}">
        <span class="nav-icon">📝</span> Final Exam <span class="nav-badge">EXAM</span>
      </a>
      <a href="monthlytest.html" class="nav-item ${activeModule === 'monthlytest' ? 'active' : ''}">
        <span class="nav-icon">🗓️</span> Monthly Test
        ${isMod
          ? `<span class="nav-badge" style="background:rgba(100,150,255,0.15);color:#6496ff;">MOD</span>`
          : !isAdmin && (udata.employeeType || 'new') === 'new'
            ? `<span class="nav-badge" style="background:rgba(255,61,113,0.12);color:var(--danger);">🔒</span>`
            : `<span class="nav-badge">MTH</span>`}
      </a>
      ${!isMod ? `<a href="interview.html" class="nav-item ${activeModule === 'interview' ? 'active' : ''}">
        <span class="nav-icon">🎤</span> Interview
        <span class="nav-badge" style="background:rgba(0,214,143,0.15);color:var(--success)">${ivStatus}</span>
      </a>` : ''}
      ${(isAdmin || isLeader) ? `
      <a href="leader.html" class="nav-item ${activeModule === 'leader' ? 'active' : ''}">
        <span class="nav-icon">👥</span> Member Management
        <span class="nav-badge" style="background:rgba(255,165,0,0.18);color:#ffaa33;">TEAM</span>
      </a>` : ''}
      ${isAdmin ? `
      <div class="nav-section-title">Administration</div>
      <a href="admin.html" class="nav-item ${activeModule === 'admin' ? 'active' : ''}">
        <span class="nav-icon">⚙️</span> Admin Panel
        <span class="nav-badge" style="background:rgba(255,215,0,0.2);color:var(--gold)">ADMIN</span>
      </a>
      <a href="tracker.html" class="nav-item ${activeModule === 'tracker' ? 'active' : ''}">
        <span class="nav-icon">📊</span> User Tracker
        <span class="nav-badge" style="background:rgba(100,150,255,0.15);color:#6496ff;">NEW</span>
      </a>` : ''}
      ${isMod ? `
      <div class="nav-section-title">Moderator</div>
      <a href="exam.html" class="nav-item ${activeModule === 'exam' ? 'active' : ''}">
        <span class="nav-icon">📝</span> Final Exam <span class="nav-badge" style="background:rgba(100,150,255,0.15);color:#6496ff;">VIEW</span>
      </a>
      <a href="tracker.html" class="nav-item ${activeModule === 'tracker' ? 'active' : ''}">
        <span class="nav-icon">📊</span> User Tracker
        <span class="nav-badge" style="background:rgba(100,150,255,0.15);color:#6496ff;">MOD</span>
      </a>` : ''}
    </nav>
    <div class="sidebar-footer">
      <button class="logout-btn" onclick="doLogout()">🚪 Sign Out</button>
    </div>`;
}

// ===== MODULE READING PROGRESS & SECTION NAV =====
(function initModuleProgress() {
  // Only run on module pages (they have a #quizContainer)
  if (!document.getElementById('quizContainer')) return;

  // --- 1. Reading progress bar ---
  const bar = document.createElement('div');
  bar.id = 'readingProgress';
  document.body.appendChild(bar);

  // --- 2. Section nav dots ---
  const sections = Array.from(document.querySelectorAll('.content-section, .quiz-section'));
  let dots = [];

  if (sections.length > 0) {
    const nav = document.createElement('div');
    nav.id = 'sectionNav';

    sections.forEach((sec, i) => {
      const h3 = sec.querySelector('h3');
      const rawLabel = h3 ? h3.textContent.trim() : (sec.classList.contains('quiz-section') ? '📝 Quiz' : 'Section ' + (i + 1));
      // Keep full label for tooltip (emoji + text), max 32 chars
      const label = rawLabel.length > 32 ? rawLabel.slice(0, 31) + '…' : rawLabel;

      const dot = document.createElement('div');
      dot.className = 'sec-dot';
      dot.innerHTML = `<span class="sec-dot-tip">${label}</span>`;
      dot.addEventListener('click', () => {
        const offset = 72; // top-bar height + a bit of breathing room
        const top = sec.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      });
      nav.appendChild(dot);
      dots.push(dot);
    });

    document.body.appendChild(nav);
  }

  // --- 3. Scroll handler ---
  function onScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;

    // Reading bar width
    const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
    bar.style.width = pct + '%';

    // Active dot
    if (dots.length === 0) return;
    let activeIdx = 0;
    sections.forEach((sec, i) => {
      if (sec.getBoundingClientRect().top <= 100) activeIdx = i;
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === activeIdx);
      // Mark sections above active as "done"
      dot.classList.toggle('done', i < activeIdx);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load
})();

// ===== BACKGROUND FIREBASE SYNC =====
// Runs after the page has rendered using locally-cached data.
// On completion, refreshes the sidebar and quiz state so fresh Firebase
// data is shown without a full page reload.
window.addEventListener('load', async function() {
  if (typeof syncFromFirebase !== 'function') return;
  await syncFromFirebase();
  // Refresh sidebar
  const sb = document.getElementById('sidebar');
  if (sb && typeof getSidebarHTML === 'function') {
    // Determine active module from the existing active nav item
    const activeEl = sb.querySelector('.nav-item.active');
    // Re-render sidebar (data updated in localStorage by syncFromFirebase)
    sb.innerHTML = getSidebarHTML(
      activeEl ? (activeEl.id ? +activeEl.id.replace('nav-m','') || activeEl.id.replace('nav-','') : 0) : 0
    );
  }
  updateSidebarProgress();
  initModProposalBtn();
});

// ===== MODERATOR CONTENT PROPOSAL =====
const _MOD_PAGE_MAP = {
  'module1.html': { moduleId: 1, moduleName: 'Products' },
  'module2.html': { moduleId: 2, moduleName: 'Trading Rules' },
  'module3.html': { moduleId: 3, moduleName: 'Profit & Payouts' },
  'module4.html': { moduleId: 4, moduleName: 'Payment Methods' },
  'module5.html': { moduleId: 5, moduleName: 'Financial Products' },
  'module6.html': { moduleId: 6, moduleName: 'Introducing Partner' },
  'module7.html': { moduleId: 7, moduleName: 'Compliance & Risk' },
  'exam.html':    { moduleId: 0, moduleName: 'Final Exam' },
  'monthlytest.html': { moduleId: 0, moduleName: 'Monthly Test' },
  'leader.html':      { moduleId: 0, moduleName: 'Leader Dashboard' },
};

function initModProposalBtn() {
  const user  = localStorage.getItem('wmt_user') || '';
  const users = typeof getUsersDB === 'function' ? getUsersDB() : {};
  const udata = users[user] || {};
  if (udata.role !== 'mod') return; // only for moderators

  const page = window.location.pathname.split('/').pop() || window.location.pathname.split('\\').pop();
  const pageInfo = _MOD_PAGE_MAP[page];
  if (!pageInfo) return; // not a supported page

  // Create floating propose-edit button
  const fab = document.createElement('button');
  fab.id = 'modProposeFAB';
  fab.title = 'Suggest Content Edit';
  fab.innerHTML = '✏️ Submit Proposal';
  fab.style.cssText = [
    'position:fixed', 'bottom:24px', 'right:24px', 'z-index:9000',
    'background:linear-gradient(135deg,#6496ff,#4a6fe0)',
    'color:#fff', 'border:none', 'border-radius:28px',
    'padding:10px 20px', 'font-size:0.88rem', 'font-weight:700',
    'cursor:pointer', 'box-shadow:0 4px 16px rgba(100,150,255,0.45)',
    'display:flex', 'align-items:center', 'gap:6px',
    'transition:transform 0.15s,box-shadow 0.15s'
  ].join(';');
  fab.onmouseenter = () => { fab.style.transform = 'translateY(-2px)'; fab.style.boxShadow = '0 6px 20px rgba(100,150,255,0.6)'; };
  fab.onmouseleave = () => { fab.style.transform = ''; fab.style.boxShadow = '0 4px 16px rgba(100,150,255,0.45)'; };
  fab.onclick = () => openModProposalModal(pageInfo);
  document.body.appendChild(fab);
}

function openModProposalModal(pageInfo) {
  const existing = document.getElementById('modProposalModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'modProposalModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.65);padding:16px;';
  modal.innerHTML = `
    <div style="background:#12122a;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 16px 48px rgba(0,0,0,0.6);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h3 style="margin:0;color:#fff;font-size:1rem;">✏️ Suggest Edit — Module ${pageInfo.moduleId || ''} ${pageInfo.moduleName}</h3>
        <button onclick="document.getElementById('modProposalModal').remove()" style="background:none;border:none;color:#888;font-size:1.3rem;cursor:pointer;padding:0 4px;">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label style="display:block;font-size:0.8rem;color:#aaa;margin-bottom:5px;">Section / Item to Edit <span style="color:#ff6b6b">*</span></label>
          <input id="mpSection" placeholder="e.g. Leverage table, Zero commission callout, Quiz question #3…" style="width:100%;padding:9px 12px;background:#0a0a1a;border:1px solid #2a2a4a;border-radius:8px;color:#fff;font-size:0.88rem;box-sizing:border-box;">
        </div>
        <div>
          <label style="display:block;font-size:0.8rem;color:#aaa;margin-bottom:5px;">Current Content (original)</label>
          <textarea id="mpOriginal" rows="3" placeholder="Paste the current content to be changed (if any)…" style="width:100%;padding:9px 12px;background:#0a0a1a;border:1px solid #2a2a4a;border-radius:8px;color:#fff;font-size:0.88rem;resize:vertical;box-sizing:border-box;"></textarea>
        </div>
        <div>
          <label style="display:block;font-size:0.8rem;color:#aaa;margin-bottom:5px;">Proposed Content <span style="color:#ff6b6b">*</span></label>
          <textarea id="mpProposed" rows="4" placeholder="Enter your proposed edit…" style="width:100%;padding:9px 12px;background:#0a0a1a;border:1px solid #2a2a4a;border-radius:8px;color:#fff;font-size:0.88rem;resize:vertical;box-sizing:border-box;"></textarea>
        </div>
        <div>
          <label style="display:block;font-size:0.8rem;color:#aaa;margin-bottom:5px;">Notes / Reason</label>
          <input id="mpNote" placeholder="Reason for the proposed edit (optional)…" style="width:100%;padding:9px 12px;background:#0a0a1a;border:1px solid #2a2a4a;border-radius:8px;color:#fff;font-size:0.88rem;box-sizing:border-box;">
        </div>
        <div id="mpError" style="color:#ff6b6b;font-size:0.82rem;display:none;"></div>
        <div style="display:flex;gap:10px;margin-top:4px;">
          <button onclick="submitModProposal(${JSON.stringify(pageInfo)})" style="flex:1;padding:10px;background:linear-gradient(135deg,#6496ff,#4a6fe0);color:#fff;border:none;border-radius:8px;font-size:0.88rem;font-weight:700;cursor:pointer;">📤 Submit Proposal</button>
          <button onclick="document.getElementById('modProposalModal').remove()" style="padding:10px 18px;background:#1e1e3a;color:#aaa;border:1px solid #2a2a4a;border-radius:8px;font-size:0.88rem;cursor:pointer;">Cancel</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.getElementById('mpSection').focus();
}

function submitModProposal(pageInfo) {
  const section  = (document.getElementById('mpSection')?.value  || '').trim();
  const original = (document.getElementById('mpOriginal')?.value || '').trim();
  const proposed = (document.getElementById('mpProposed')?.value || '').trim();
  const note     = (document.getElementById('mpNote')?.value     || '').trim();
  const errEl    = document.getElementById('mpError');

  if (!section || !proposed) {
    if (errEl) { errEl.textContent = '⚠️ Please fill in the Section to Edit and Proposed Content fields.'; errEl.style.display = 'block'; }
    return;
  }

  const user = localStorage.getItem('wmt_user') || 'mod';
  const proposals = JSON.parse(localStorage.getItem('wmt_proposals') || '[]');
  const entry = {
    id:         Date.now().toString(),
    source:     'module',
    moduleId:   pageInfo.moduleId,
    moduleName: pageInfo.moduleName,
    section,
    original:   original ? { text: original } : null,
    proposed:   { text: proposed },
    note,
    proposedBy: user,
    proposedAt: new Date().toISOString(),
    status:     'pending'
  };
  proposals.push(entry);
  if (typeof dbWrite === 'function') {
    dbWrite('wmt_proposals', JSON.stringify(proposals));
  } else {
    localStorage.setItem('wmt_proposals', JSON.stringify(proposals));
  }

  document.getElementById('modProposalModal')?.remove();
  // Brief success toast
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:80px;right:24px;z-index:9600;background:#1e3a2a;border:1px solid var(--success,#4CAF50);color:#4CAF50;border-radius:10px;padding:12px 20px;font-size:0.88rem;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
  toast.textContent = '✅ Proposal submitted successfully!';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
