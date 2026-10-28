// ===== FIREBASE CONFIG =====
// Replace the values below with your actual Firebase project credentials.
// Get them from: Firebase Console → Project Settings → Your apps → Config
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDWRWgJk2JR2ZWkgZUO4PEaBR61f60pr5M",
  authDomain: "wmt-training-portal.firebaseapp.com",
  databaseURL: "https://wmt-training-portal-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wmt-training-portal",
  storageBucket: "wmt-training-portal.firebasestorage.app",
  messagingSenderId: "629464411536",
  appId: "1:629464411536:web:f6b73e3e121d3ba1ae9715",
  measurementId: "G-NZK3GJJQY2"
};

// ── Init ───────────────────────────────────────────────────────────────────
const _FB_READY = firebaseConfig.apiKey !== "your_API_key";

if (_FB_READY) {
  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    window.FDB = firebase.database();
  } catch (e) {
    console.warn("[Firebase] Init failed:", e.message);
    window.FDB = null;
  }
} else {
  window.FDB = null;
  console.info("[Firebase] Config not set — running in localStorage-only mode.");
}

// ── Path mapper ────────────────────────────────────────────────────────────
// Maps a localStorage key to a Firebase Realtime Database path.
function _fbPath(key) {
  // Global collections
  if (key === 'wmt_users_db')            return 'users';
  if (key === 'wmt_exam_qbank')          return 'exam_qbank';
  if (key === 'wmt_monthly_config')      return 'monthly_config';
  if (key === 'wmt_monthly_scores')      return 'monthly_scores';
  if (key === 'wmt_supp_schedules')      return 'supp_schedules';
  if (key === 'wmt_proposals')           return 'proposals';
  if (key === 'wmt_interviews_list')     return 'interviews_list';
  if (key === 'wmt_qbank_bdcs')          return 'qbank/bdcs';
  if (key === 'wmt_qbank_others')        return 'qbank/others';

  // Per-user: wmt_progress_{user}
  const progressMatch = key.match(/^wmt_progress_(.+)$/);
  if (progressMatch) return `progress/${progressMatch[1]}`;

  // Per-user: wmt_exam_{user}
  const examMatch = key.match(/^wmt_exam_(.+)$/);
  if (examMatch) return `exam/${examMatch[1]}`;

  // Per-user quiz: wmt_quiz_{user}_m{n}
  const quizMatch = key.match(/^wmt_quiz_(.+)_m(\d+)$/);
  if (quizMatch) return `quiz/${quizMatch[1]}/m${quizMatch[2]}`;

  // Per-user interview: wmt_interview_{user}
  const ivMatch = key.match(/^wmt_interview_(.+)$/);
  if (ivMatch) return `interview/${ivMatch[1]}`;

  // Per-user submission: wmt_sub_{user}_{month}
  const subMatch = key.match(/^wmt_sub_(.+)_(\d{4}-\d{2})$/);
  if (subMatch) return `submissions/${subMatch[1]}/${subMatch[2]}`;

  // Generated test: wmt_gentest_{group}_{month}
  const genMatch = key.match(/^wmt_gentest_(.+)_(\d{4}-\d{2})$/);
  if (genMatch) return `gentest/${genMatch[1]}/${genMatch[2]}`;

  // Monthly reschedule: wmt_monthly_reschedule_{user}
  const rsMatch = key.match(/^wmt_monthly_reschedule_(.+)$/);
  if (rsMatch) return `reschedule/${rsMatch[1]}`;

  // Supplementary reschedule: wmt_supp_reschedule_{user}
  const suppRsMatch = key.match(/^wmt_supp_reschedule_(.+)$/);
  if (suppRsMatch) return `supp_reschedule/${suppRsMatch[1]}`;

  // Per-user evaluation: wmt_eval_{user}
  const evalMatch = key.match(/^wmt_eval_(.+)$/);
  if (evalMatch) return `evaluations/${evalMatch[1]}`;

  // Fallback: store under misc/
  return `misc/${key.replace(/^wmt_/, '')}`;
}

// ── Write ──────────────────────────────────────────────────────────────────
// Writes to localStorage synchronously and fires to Firebase in the background.
// value must be a JSON string (same as what you'd pass to localStorage.setItem).
window.dbWrite = function(key, value) {
  _lsSet(key, value);
  if (window.FDB) {
    try {
      const parsed = JSON.parse(value);
      window.FDB.ref(_fbPath(key)).set(parsed)
        .catch(err => console.warn(`[Firebase] write failed (${key}):`, err.message));
    } catch (e) {
      console.warn(`[Firebase] dbWrite parse error (${key}):`, e.message);
    }
  }
};

// ── Remove ─────────────────────────────────────────────────────────────────
window.dbRemove = function(key) {
  localStorage.removeItem(key);
  if (window.FDB) {
    window.FDB.ref(_fbPath(key)).remove()
      .catch(err => console.warn(`[Firebase] remove failed (${key}):`, err.message));
  }
};

// ── Safe localStorage write — frees old gentest/draft cache if quota is hit ──
function _lsSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch(e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      // Free up space: remove old gentest caches and test drafts, then retry once
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('wmt_gentest_') || k.startsWith('wmt_test_draft_'))) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
      try { localStorage.setItem(key, value); } catch(e2) {
        console.warn('[localStorage] quota still exceeded after cleanup:', key);
      }
    }
  }
}

// ── Sync from Firebase → localStorage ─────────────────────────────────────
// Call `await syncFromFirebase()` on page load so every device gets fresh data.
// After this resolves, all reads can use localStorage as normal (fast + sync).
// Has a 10-second hard timeout so a slow/unresponsive Firebase never blocks render.
window.syncFromFirebase = async function() {
  if (!window.FDB) return; // no-op in localStorage-only mode
  await Promise.race([
    _syncCore(),
    new Promise(r => setTimeout(r, 10000)) // 10 s hard timeout
  ]);
};

async function _syncCore() {
  try {
    // ── Global data (all fetched in parallel) ──
    const globalKeys = [
      { fb: 'users',            ls: 'wmt_users_db' },
      { fb: 'exam_qbank',       ls: 'wmt_exam_qbank' },
      { fb: 'monthly_config',   ls: 'wmt_monthly_config' },
      { fb: 'monthly_scores',   ls: 'wmt_monthly_scores' },
      { fb: 'supp_schedules',   ls: 'wmt_supp_schedules' },
      { fb: 'proposals',        ls: 'wmt_proposals' },
      { fb: 'interviews_list',  ls: 'wmt_interviews_list' },
      { fb: 'qbank/bdcs',       ls: 'wmt_qbank_bdcs' },
      { fb: 'qbank/others',     ls: 'wmt_qbank_others' },
    ];

    await Promise.all(globalKeys.map(async ({ fb, ls }) => {
      try {
        const snap = await window.FDB.ref(fb).once('value');
        if (snap.exists()) _lsSet(ls, JSON.stringify(snap.val()));
      } catch (e) {
        console.warn(`[Firebase] sync failed (${fb}):`, e.message);
      }
    }));

    // ── Per-user data ──
    // Admin/Mod sync all users; regular trainees only sync their own data to avoid
    // filling localStorage (quota ~5 MB) with every other user's submissions/quiz/progress.
    const usersDB   = JSON.parse(localStorage.getItem('wmt_users_db') || '{}');
    const allUsers  = Object.keys(usersDB);
    if (!allUsers.length) return;

    const curUser   = localStorage.getItem('wmt_user') || '';
    const curRole   = usersDB[curUser]?.role || '';
    const isPriv    = curRole === 'admin' || curRole === 'mod';
    // Privileged users sync everyone; trainees sync only themselves
    const syncUsers = isPriv ? allUsers : (curUser ? [curUser] : []);

    const perUserPaths = [];
    syncUsers.forEach(u => {
      perUserPaths.push({ fb: `progress/${u}`,        ls: `wmt_progress_${u}`,              clearable: false });
      perUserPaths.push({ fb: `exam/${u}`,             ls: `wmt_exam_${u}`,                  clearable: true  });
      perUserPaths.push({ fb: `interview/${u}`,        ls: `wmt_interview_${u}`,             clearable: true  });
      perUserPaths.push({ fb: `reschedule/${u}`,       ls: `wmt_monthly_reschedule_${u}`,    clearable: true  });
      perUserPaths.push({ fb: `supp_reschedule/${u}`,  ls: `wmt_supp_reschedule_${u}`,       clearable: true  });
      perUserPaths.push({ fb: `evaluations/${u}`,      ls: `wmt_eval_${u}`,                  clearable: false });
    });

    await Promise.all(perUserPaths.map(async ({ fb, ls, clearable }) => {
      try {
        const snap = await window.FDB.ref(fb).once('value');
        if (snap.exists()) {
          _lsSet(ls, JSON.stringify(snap.val()));
        } else if (clearable) {
          localStorage.removeItem(ls);
        }
      } catch (e) {
        console.warn(`[Firebase] sync failed (${fb}):`, e.message);
      }
    }));

    // ── Quiz results: quiz/{user} ──
    await Promise.all(syncUsers.map(async u => {
      try {
        const snap = await window.FDB.ref(`quiz/${u}`).once('value');
        for (let m = 1; m <= 8; m++) localStorage.removeItem(`wmt_quiz_${u}_m${m}`);
        if (snap.exists()) {
          Object.keys(snap.val()).forEach(mKey => {
            _lsSet(`wmt_quiz_${u}_m${mKey.replace('m','')}`, JSON.stringify(snap.val()[mKey]));
          });
        }
      } catch (e) {
        console.warn(`[Firebase] quiz sync failed (${u}):`, e.message);
      }
    }));

    // ── Submissions: only current user's (admins get all via real-time listeners) ──
    const subUsers = isPriv ? allUsers : (curUser ? [curUser] : []);
    await Promise.all(subUsers.map(async u => {
      try {
        const snap = await window.FDB.ref(`submissions/${u}`).once('value');
        if (snap.exists()) {
          Object.entries(snap.val()).forEach(([month, sub]) => {
            _lsSet(`wmt_sub_${u}_${month}`, JSON.stringify(sub));
          });
        }
      } catch (e) {
        console.warn(`[Firebase] submissions sync failed (${u}):`, e.message);
      }
    }));

    // ── Generated tests: gentest/{group} ──
    await Promise.all(['bdcs', 'others'].map(async g => {
      try {
        const snap = await window.FDB.ref(`gentest/${g}`).once('value');
        if (snap.exists()) {
          Object.entries(snap.val()).forEach(([month, data]) => {
            _lsSet(`wmt_gentest_${g}_${month}`, JSON.stringify(data));
          });
        }
      } catch (e) {
        console.warn(`[Firebase] gentest sync failed (${g}):`, e.message);
      }
    }));

  } catch (e) {
    console.warn('[Firebase] syncFromFirebase error:', e.message);
  }
}
