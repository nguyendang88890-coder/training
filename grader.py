#!/usr/bin/env python3
"""WMT Training Portal — Server-side Quiz Grader (port 3001)"""
import json, http.server, socketserver

MODULE_KEYS = {
    1: [1, 1, 0, 3, 1, 1, 3],
    2: [1, 2, 2, 2, 1],
    3: [2, 2, 1, 1, 0],
    4: [2, 2, 1, 2, 3],
    5: [0, 1, 2, 3, 2, 0, 2],
    6: [2, 2, 1, 2],
    7: [2, 0, 1, 2, 2]
}

EXAM_KEYS = [
    1,2,2,2,2,1,1,3,  # Q0-7:  About WMT
    1,3,1,3,3,2,2,1,  # Q8-15: Module 1 part A
    2,3,2,1,1,0,1,2,  # Q16-23: Module 1 part B
    2,1,2,2,0,1,0,2,  # Q24-31: Module 2 + 3
    2,1,1,2,1,2,1,0,  # Q32-39: Module 3 + 4
    1,1,3,1,2,2,2,3,  # Q40-47: Module 4 + 5
    2,1,2,3,2,2,2,2,  # Q48-55: Module 5 + 6
    0,1,1,2,2,2,2,0,  # Q56-63: Module 6 + 7
    1,1,2,2           # Q64-67: Module 7
]

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
}

class GraderHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # silence access log

    def send_json(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)
        self.end_headers()

    def do_POST(self):
        path = self.path.split('?')[0]
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length))
        except Exception:
            self.send_json(400, {'error': 'bad request'})
            return

        if path == '/api/grade/module':
            mid = body.get('moduleId')
            answers = body.get('answers', [])
            keys = MODULE_KEYS.get(mid)
            if not keys:
                self.send_json(400, {'error': 'unknown module'})
                return
            if len(answers) != len(keys):
                self.send_json(400, {'error': 'answer count mismatch'})
                return
            correct = [a == k for a, k in zip(answers, keys)]
            correct_count = sum(correct)
            total = len(keys)
            score = round(correct_count / total * 100)
            self.send_json(200, {
                'correct': correct,
                'correctAnswers': keys,
                'correctCount': correct_count,
                'total': total,
                'score': score,
                'pass': score >= 60
            })

        elif path == '/api/grade/exam':
            q_indices = body.get('questionIndices', [])
            answers = body.get('answers', [])
            attempt = body.get('attemptNumber', 1)
            if len(q_indices) != len(answers):
                self.send_json(400, {'error': 'invalid payload'})
                return
            correct_ans = [EXAM_KEYS[i] if 0 <= i < len(EXAM_KEYS) else -1 for i in q_indices]
            correct = [a == k for a, k in zip(answers, correct_ans)]
            correct_count = sum(correct)
            total = len(answers)
            score = round(correct_count / total * 100) if total else 0
            pass_threshold = 60 if attempt == 1 else 80
            self.send_json(200, {
                'correct': correct,
                'correctAnswers': correct_ans,
                'correctCount': correct_count,
                'total': total,
                'score': score,
                'passThreshold': pass_threshold,
                'passed': score >= pass_threshold
            })

        else:
            self.send_json(404, {'error': 'not found'})

PORT = 3001
with socketserver.TCPServer(('', PORT), GraderHandler) as httpd:
    httpd.allow_reuse_address = True
    print(f'[WMT Grader] Listening on port {PORT}')
    httpd.serve_forever()
