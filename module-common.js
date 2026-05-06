// ===== SHARED MODULE LOGIC =====
// Auth guard
(function() {
  const user = localStorage.getItem('wmt_user');
  const USERS = { admin: 'wmt2026', test: 'test123', trainee: 'train123' };
  if (!user || !USERS[user]) {
    window.location.href = 'index.html';
  }
})();

function getProgress() {
  return JSON.parse(localStorage.getItem('wmt_progress') || '{}');
}

function saveProgress(data) {
  localStorage.setItem('wmt_progress', JSON.stringify(data));
}

function markModuleComplete(moduleId) {
  const p = getProgress();
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
    this.renderQuestion(0);
    this.renderDots();
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
              if (oi === q.correct) cls = 'correct';
              else if (oi === this.answers[idx]) cls = 'wrong';
            } else if (oi === this.answers[idx]) cls = 'selected';
            return `<li class="option-item ${cls}" onclick="${answered ? '' : `quiz.select(${oi})`}">
              <span class="option-letter">${String.fromCharCode(65+oi)}</span>
              ${opt}
            </li>`;
          }).join('')}
        </ul>
        ${answered ? `<div class="feedback-box show ${this.answers[idx] === q.correct ? 'correct' : 'wrong'}">
          ${this.answers[idx] === q.correct ? '✓ Correct! Well done.' : `✗ Incorrect. The correct answer is: ${q.opts[q.correct]}`}
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
        cls = this.answers[i] === q.correct ? 'correct' : 'wrong';
      }
      return `<div class="q-dot ${cls}"></div>`;
    }).join('');
  }

  submit() {
    let correct = 0;
    this.answers.forEach((a, i) => { if (a === this.questions[i].correct) correct++; });
    const score = Math.round((correct / this.questions.length) * 100);

    // Save score
    const p = getProgress();
    p[`module${this.moduleId}_score`] = score;
    p[`module${this.moduleId}_done`] = true;
    saveProgress(p);

    // Show result
    const result = document.getElementById('quizResult');
    const scoreEl = document.getElementById('quizScore');
    result.classList.add('show');
    scoreEl.textContent = `${correct}/${this.questions.length} — ${score}%`;
    scoreEl.className = `result-score ${score >= 60 ? 'pass' : 'fail'}`;

    document.getElementById('quizResultMsg').textContent = score >= 60
      ? '🎉 Great job! Module marked as complete.'
      : '📚 Review the material and retake the quiz to improve your score.';

    // Update mark complete
    const btn = document.getElementById('markCompleteBtn');
    const chk = document.getElementById('completedCheck');
    if (btn) btn.style.display = 'none';
    if (chk) chk.style.display = 'flex';

    updateSidebarProgress();

    // Hide question container
    document.getElementById('quizContainer').innerHTML = '';
    document.getElementById('quizNavBottom').innerHTML = '';
  }
}

// Sidebar HTML snippet generator
function getSidebarHTML(activeModule) {
  const modules = [
    { id: 1, icon: '📦', title: 'Products', file: 'module1.html' },
    { id: 3, icon: '📋', title: 'Trading Rules', file: 'module3.html' },
    { id: 4, icon: '💰', title: 'Financial Products', file: 'module4.html' },
    { id: 6, icon: '🏆', title: 'Profit & Payouts', file: 'module6.html' },
    { id: 5, icon: '💳', title: 'Payment Methods', file: 'module5.html' },
    { id: 2, icon: '🤝', title: 'Affiliate & Partners', file: 'module2.html' },
    { id: 7, icon: '⚖️', title: 'Compliance & Risk', file: 'module7.html' }
  ];
  const user = localStorage.getItem('wmt_user') || 'Trainee';
  return `
    <div class="sidebar-header">
      <div class="sidebar-logo">WeMasterTrade</div>
      <div class="sidebar-subtitle">Sales Training Portal</div>
    </div>
    <div class="sidebar-user">
      <div class="user-avatar">${user[0].toUpperCase()}</div>
      <div class="user-info">
        <div class="user-name">${user}</div>
        <div class="user-role">Sales Trainee</div>
      </div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section-title">Training Modules</div>
      <a href="index.html#dashboard" class="nav-item"><span class="nav-icon">🏠</span> Dashboard</a>
      <a href="about.html" class="nav-item ${activeModule === 'about' ? 'active' : ''}"><span class="nav-icon">🏢</span> About WMT</a>
      ${modules.map(m => `
        <a href="${m.file}" class="nav-item ${m.id === activeModule ? 'active' : ''}" id="nav-m${m.id}">
          <span class="nav-icon">${m.icon}</span> <span>${m.title}</span>
          <span class="nav-badge" id="badge-m${m.id}">M${m.id}</span>
        </a>`).join('')}
      <div class="nav-section-title">Assessment</div>
      <a href="exam.html" class="nav-item"><span class="nav-icon">📝</span> Final Exam <span class="nav-badge">EXAM</span></a>
    </nav>
    <div class="sidebar-footer">
      <button class="logout-btn" onclick="doLogout()">🚪 Sign Out</button>
    </div>`;
}
