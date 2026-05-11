// ===== SHARED MODULE LOGIC =====

function getUsersDB() {
  let users = JSON.parse(localStorage.getItem('wmt_users_db') || 'null');
  if (!users) {
    users = {
      admin:   { password: 'wmt2026',  role: 'admin',   createdAt: new Date().toISOString() },
      test:    { password: 'test123',  role: 'trainee', createdAt: new Date().toISOString() },
      trainee: { password: 'train123', role: 'trainee', createdAt: new Date().toISOString() }
    };
    dbWrite('wmt_users_db', JSON.stringify(users));
  }
  if (!users.admin) {
    users.admin = { password: 'wmt2026', role: 'admin', createdAt: new Date().toISOString() };
    dbWrite('wmt_users_db', JSON.stringify(users));
  }
  return users;
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
  users[user].email    = document.getElementById('pmEmail').value.trim();
  users[user].fullName = document.getElementById('pmFullName').value.trim();
  dbWrite('wmt_users_db', JSON.stringify(users));
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
        <div style="font-weight:700;color:#6496ff;font-size:0.9rem;">Quiz Đã Được Nộp</div>
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
      this._lockBanner(`Nộp lúc: ${new Date(saved.submittedAt).toLocaleString('vi-VN')} &nbsp;·&nbsp; Liên hệ admin để làm lại bài quiz.`) +
      this.buildReviewHTML();
    this._showResult(saved.score, `${saved.correct}/${saved.total} — ${saved.score}%`);
  }

  showLockedLegacy(score) {
    document.getElementById('quizContainer').innerHTML =
      this._lockBanner('Liên hệ admin để làm lại bài quiz.');
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

  // Pre-compute role display string to avoid IIFE inside template literal
  let userRoleDisplay;
  if (isAdmin) {
    userRoleDisplay = 'Administrator';
  } else if (isMod) {
    userRoleDisplay = '🛡️ Moderator';
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
      <a href="about.html" class="nav-item ${activeModule === 'about' ? 'active' : ''}"><span class="nav-icon">🏢</span> About WMT</a>
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
      ${isAdmin ? `
      <div class="nav-section-title">Administration</div>
      <a href="admin.html" class="nav-item ${activeModule === 'admin' ? 'active' : ''}">
        <span class="nav-icon">⚙️</span> Admin Panel
        <span class="nav-badge" style="background:rgba(255,215,0,0.2);color:var(--gold)">ADMIN</span>
      </a>` : ''}
      ${isMod ? `
      <div class="nav-section-title">Moderator</div>
      <a href="exam.html" class="nav-item ${activeModule === 'exam' ? 'active' : ''}">
        <span class="nav-icon">📝</span> Final Exam <span class="nav-badge" style="background:rgba(100,150,255,0.15);color:#6496ff;">VIEW</span>
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
});
