// WMT Training Portal — Server-side Quiz Grader
// Run with: node server.js  (port 3001)
// Keep alive with: pm2 start server.js --name wmt-grader
const http = require('http');

// ===== MODULE QUIZ ANSWER KEYS (0-based index) =====
const MODULE_KEYS = {
  1: [0, 3, 0, 0, 1, 1, 3],
  2: [1, 2, 2, 2, 1],
  3: [2, 2, 1, 1, 0],
  4: [2, 2, 1, 2, 3],
  5: [0, 1, 2, 3, 2, 0, 2],
  6: [2, 2, 1, 2],
  7: [2, 0, 1, 2, 2]
};

// ===== EXAM QUESTION BANK ANSWER KEYS (0-based index) =====
// Index matches QUESTION_BANK array order in exam.html (68 questions)
const EXAM_KEYS = [
  1,2,2,2,2,1,1,3,  // Q0-7:  About WMT
  1,3,1,3,3,2,2,1,  // Q8-15: Module 1 (Products) part A
  2,3,2,1,1,0,1,2,  // Q16-23: Module 1 part B + Module 2 start
  2,1,2,2,0,1,0,2,  // Q24-31: Module 2 + Module 3
  2,1,1,2,1,2,1,0,  // Q32-39: Module 3 + Module 4
  1,1,3,1,2,2,2,3,  // Q40-47: Module 4 + Module 5
  2,1,2,3,2,2,2,2,  // Q48-55: Module 5 + Module 6
  0,1,1,2,2,2,2,0,  // Q56-63: Module 6 + Module 7
  1,1,2,2           // Q64-67: Module 7 continued
];

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 50000) reject(new Error('too large')); });
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  // ===== Grade module quiz =====
  if (req.method === 'POST' && url === '/api/grade/module') {
    let body;
    try { body = await readBody(req); } catch(e) { sendJSON(res, 400, { error: 'bad request' }); return; }

    const { moduleId, answers } = body;
    const keys = MODULE_KEYS[moduleId];
    if (!keys) { sendJSON(res, 400, { error: 'unknown module' }); return; }
    if (!Array.isArray(answers) || answers.length !== keys.length) {
      sendJSON(res, 400, { error: 'answer count mismatch' });
      return;
    }

    const correct = keys.map((k, i) => answers[i] === k);
    const correctCount = correct.filter(Boolean).length;
    const score = Math.round((correctCount / keys.length) * 100);

    sendJSON(res, 200, {
      correct,
      correctAnswers: keys,
      correctCount,
      total: keys.length,
      score,
      pass: score >= 60
    });
    return;
  }

  // ===== Grade exam =====
  if (req.method === 'POST' && url === '/api/grade/exam') {
    let body;
    try { body = await readBody(req); } catch(e) { sendJSON(res, 400, { error: 'bad request' }); return; }

    const { questionIndices, answers, attemptNumber } = body;
    if (!Array.isArray(questionIndices) || !Array.isArray(answers) || questionIndices.length !== answers.length) {
      sendJSON(res, 400, { error: 'invalid payload' });
      return;
    }

    const correct = questionIndices.map((qi, i) => {
      if (qi < 0 || qi >= EXAM_KEYS.length) return false;
      return answers[i] === EXAM_KEYS[qi];
    });
    const correctCount = correct.filter(Boolean).length;
    const score = Math.round((correctCount / answers.length) * 100);
    const passThreshold = (attemptNumber || 1) === 1 ? 60 : 80;
    const passed = score >= passThreshold;

    sendJSON(res, 200, {
      correct,
      correctAnswers: questionIndices.map(qi => EXAM_KEYS[qi] ?? -1),
      correctCount,
      total: answers.length,
      score,
      passThreshold,
      passed
    });
    return;
  }

  sendJSON(res, 404, { error: 'not found' });
});

server.listen(3001, () => console.log('[WMT Grader] Running on port 3001'));
