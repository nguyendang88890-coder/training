// ===== WMT BILINGUAL SYSTEM (EN / VI) =====
// Language stored in localStorage key: wmt_lang
// Values: 'en' | 'vi'

(function () {
  // ---- Preference ----
  window._getLang = function () {
    return localStorage.getItem('wmt_lang') || 'en';
  };
  window._setLang = function (lang) {
    localStorage.setItem('wmt_lang', lang);
    _applyLang(lang);
    _updateSwitcherUI(lang);
  };

  // ---- Dictionary ----
  // Keys are English base strings; each value is the Vietnamese equivalent.
  // Technical terms listed in KEEP_EN are never translated.
  const KEEP_EN = new Set([
    'Daily Loss','Max Loss','Profit Consistency','PC','Risk Consistency','RC',
    'Challenge','Funded','Phase 1','Phase 2','Phase 3','Scale-up','BOGO',
    '51010','510Zero','Customized','Payout','Profit Target','E-contract',
    'Trade Copier','News Trading','Weekend Holding','Trading Interval Restriction',
    'IP','HubSpot','MetaTrader','MT4','MT5','WeMasterTrade','WMT',
  ]);

  window._VI = {
    // ---- Sidebar nav ----
    'Sales Training Portal':      'Cổng Đào Tạo Sales',
    'Training Modules':           'Các Module Đào Tạo',
    'Dashboard':                  'Trang Chủ',
    'About WMT':                  'Giới Thiệu WMT',
    'Products':                   'Sản Phẩm',
    'Trading Rules':              'Quy Tắc Giao Dịch',
    'Profit & Payouts':           'Lợi Nhuận & Payout',
    'Payment Methods':            'Phương Thức Thanh Toán',
    'Financial Products':         'Sản Phẩm Tài Chính',
    'Introducing Partner':        'Đối Tác Giới Thiệu',
    'Compliance & Risk':          'Tuân Thủ & Rủi Ro',
    'HubSpot Training':           'Đào Tạo HubSpot',
    'Assessment':                 'Đánh Giá',
    'Final Exam':                 'Thi Cuối Khoá',
    'Monthly Test':               'Kiểm Tra Tháng',
    'Interview':                  'Phỏng Vấn',
    'Evaluation':                 'Đánh Giá Cuối Khoá',
    'Evaluations':                'Đánh Giá Cuối Khoá',
    'Member Management':          'Quản Lý Thành Viên',
    'Administration':             'Quản Trị',
    'Admin Panel':                'Bảng Quản Trị',
    'User Tracker':               'Theo Dõi Người Dùng',
    'Moderator':                  'Điều Phối Viên',
    'Resources':                  'Tài Nguyên',
    'BD & Sales Onboarding':      'Tài Liệu BD & Sales',
    'Sign Out':                   'Đăng Xuất',
    '🚪 Sign Out':                '🚪 Đăng Xuất',
    'Change Password':            'Đổi Mật Khẩu',
    '🔑 Change Password':         '🔑 Đổi Mật Khẩu',
    'Edit Profile':               'Chỉnh Sửa Hồ Sơ',
    '✎ Edit Profile':             '✎ Chỉnh Sửa Hồ Sơ',
    'Sales Trainee':              'Thực Tập Viên Sales',
    'BD & Sales Onboarding Guide': 'Tài Liệu BD & Sales Onboarding',
    'SharePoint Document':        'Tài Liệu SharePoint',

    // ---- Top bar / general ----
    '← Dashboard':                '← Trang Chủ',
    'Modules Done':               'Module Hoàn Thành',
    'Total Modules':              'Tổng Số Module',
    'Your Score':                 'Điểm Của Bạn',
    'Overall Progress':           'Tiến Độ Tổng Thể',
    'Avg Quiz Score':             'Điểm Quiz Trung Bình',

    // ---- Dashboard ----
    'Complete all 7 modules and pass the final exam to become a certified WeMasterTrade Sales Partner.':
      'Hoàn thành 7 module và vượt qua bài thi cuối khoá để trở thành Đối Tác Sales WeMasterTrade được chứng nhận.',
    'Welcome back':               'Chào mừng trở lại',
    'Video Interview':            'Phỏng Vấn Video',
    'Training Evaluation':        'Đánh Giá Đào Tạo',
    'Book Your Interview':        'Đặt Lịch Phỏng Vấn',
    '📅 Book Your Interview':     '📅 Đặt Lịch Phỏng Vấn',
    'Complete all modules to unlock the exam.': 'Hoàn thành tất cả module để mở khoá bài thi.',
    'Start Exam →':               'Bắt Đầu Thi →',
    'Book Interview →':           'Đặt Lịch Phỏng Vấn →',

    // ---- Module page ----
    'Module':                     'Module',
    'Start Quiz':                 'Bắt Đầu Bài Kiểm Tra',
    'Retake Quiz':                'Làm Lại Bài Kiểm Tra',
    'Quiz':                       'Bài Kiểm Tra',
    'Completed':                  'Đã Hoàn Thành',
    'Complete':                   'Hoàn Thành',
    'Locked':                     'Chưa Mở Khoá',
    'Score':                      'Điểm',
    'Best Score':                 'Điểm Cao Nhất',
    'Pass':                       'Đạt',
    'Fail':                       'Không Đạt',
    'Passed':                     'Đã Đạt',
    'Failed':                     'Chưa Đạt',
    'Attempts':                   'Số Lần',
    'Next →':                     'Tiếp Theo →',
    '← Prev':                     '← Quay Lại',
    'Submit Quiz':                'Nộp Bài',
    '⏳ Grading…':                '⏳ Đang Chấm…',
    'Answer selected — submit the quiz when you\'ve answered all questions.':
      'Đã chọn đáp án — nộp bài khi trả lời đủ các câu hỏi.',
    'Read the module above before taking the quiz.':
      'Đọc nội dung module phía trên trước khi làm bài kiểm tra.',
    'Correct!':                   'Chính xác!',
    'Incorrect.':                 'Sai rồi.',
    'Correct Answer':             'Đáp Án Đúng',
    'Your Answer':                'Câu Trả Lời Của Bạn',

    // ---- Monthly Test (taketest.html / monthlytest.html) ----
    'Monthly Test':               'Kiểm Tra Tháng',
    'questions':                  'câu hỏi',
    'Total':                      'Tổng',
    'pts':                        'điểm',
    '⏰ Remaining':               '⏰ Thời Gian Còn Lại',
    'Question':                   'Câu',
    'Multiple Choice':            'Trắc Nghiệm',
    'Essay':                      'Tự Luận',
    '⚠ Liet Points':             '⚠ Điểm Liet',
    'Answer Guide':               'Gợi Ý Trả Lời',
    'Enter your answer here...':  'Nhập câu trả lời của bạn...',
    'Write a clear and complete answer. Your response will be reviewed and graded by admin.':
      'Viết câu trả lời rõ ràng và đầy đủ. Câu trả lời sẽ được admin xem xét và chấm điểm.',
    'Answered':                   'Đã Trả Lời',
    '📤 Submit':                  '📤 Nộp Bài',
    'Essay questions will be graded by admin later.':
      'Câu hỏi tự luận sẽ được admin chấm điểm sau.',
    'Request Test Reschedule':    'Yêu Cầu Dời Lịch Thi',
    '🔄 Request Test Reschedule': '🔄 Yêu Cầu Dời Lịch Thi',
    'Test Schedule':              'Lịch Thi',
    'Test Period':                'Kỳ Thi',
    'Deadline':                   'Hạn Chót',
    'Time Remaining':             'Thời Gian Còn Lại',
    'Start Test':                 'Bắt Đầu Thi',
    'Resume Test':                'Tiếp Tục Thi',
    'View Results':               'Xem Kết Quả',
    'Not yet scheduled':          'Chưa có lịch',
    'No test scheduled':          'Chưa có lịch thi',
    'Test not available':         'Chưa có bài thi',

    // ---- Results ----
    'View Answers':               'Xem Đáp Án',
    'View Submitted Answers':     'Xem Bài Đã Nộp',
    'Submitted':                  'Đã Nộp',
    'Awaiting essay grading':     'Đang chờ chấm tự luận',
    'Monthly Scores':             'Điểm Kiểm Tra Tháng',
    'No submissions yet':         'Chưa có bài nộp',

    // ---- Exam ----
    'Start Exam':                 'Bắt Đầu Thi',
    'You have passed the Final Exam.': 'Bạn đã vượt qua bài thi cuối khoá.',
    'Disqualified':               'Bị Loại',

    // ---- Interview ----
    'Book Interview':             'Đặt Lịch Phỏng Vấn',
    'Interview Scheduled':        'Đã Có Lịch Phỏng Vấn',
    'Interview Completed':        'Đã Phỏng Vấn Xong',

    // ---- About ----
    'About WeMasterTrade':        'Giới Thiệu WeMasterTrade',

    // ---- Admin / Leader ----
    'All Users':                  'Tất Cả Người Dùng',
    'Active Users':               'Người Dùng Đang Hoạt Động',
    'Add User':                   'Thêm Người Dùng',
    'Export':                     'Xuất',
    'Import':                     'Nhập',
    'Monthly Config':             'Cấu Hình Kỳ Thi Tháng',
    'Quiz Results':               'Kết Quả Quiz',
    'Submissions':                'Bài Nộp',
    'Leaderboard':                'Bảng Xếp Hạng',
    'Score History':              'Lịch Sử Điểm',
    'Grading':                    'Chấm Điểm',
    'Grade':                      'Chấm',
    'Score (out of 100)':         'Điểm (trên 100)',
    'Feedback':                   'Nhận Xét',

    // ---- Generic / shared ----
    'Loading…':                   'Đang tải…',
    'Loading':                    'Đang tải',
    'Save':                       'Lưu',
    'Cancel':                     'Huỷ',
    'Confirm':                    'Xác Nhận',
    'Delete':                     'Xoá',
    'Edit':                       'Chỉnh Sửa',
    'Submit':                     'Nộp',
    'Back':                       'Quay Lại',
    'Close':                      'Đóng',
    'Search':                     'Tìm Kiếm',
    'Filter':                     'Lọc',
    'Status':                     'Trạng Thái',
    'Date':                       'Ngày',
    'Time':                       'Thời Gian',
    'Name':                       'Họ Tên',
    'Email':                      'Email',
    'Department':                 'Bộ Phận',
    'Role':                       'Vai Trò',
    'Action':                     'Thao Tác',
    'Actions':                    'Thao Tác',
    'Approve':                    'Duyệt',
    'Reject':                     'Từ Chối',
    'Pending':                    'Đang Chờ',
    'Approved':                   'Đã Duyệt',
    'Rejected':                   'Đã Từ Chối',
    'Active':                     'Đang Mở',
    'Upcoming':                   'Sắp Tới',
    'Expired':                    'Đã Kết Thúc',
    'No data':                    'Không có dữ liệu',
    'No result':                  'Không có kết quả',
    'Group':                      'Nhóm',
    'Month':                      'Tháng',
    'Week':                       'Tuần',
    'Year':                       'Năm',
    'Username':                   'Tên Đăng Nhập',
    'Password':                   'Mật Khẩu',
    'New Password':               'Mật Khẩu Mới',
    'Confirm Password':           'Xác Nhận Mật Khẩu',
    'Login':                      'Đăng Nhập',
    'Sign In':                    'Đăng Nhập',
    'Sign in to your account':    'Đăng nhập vào tài khoản của bạn',
    'Remember me':                'Ghi nhớ đăng nhập',
    'Forgot password?':           'Quên mật khẩu?',
    'Note':                       'Ghi Chú',
    'Reason':                     'Lý Do',
    'Comment':                    'Nhận Xét',
    'Send':                       'Gửi',
    'Download':                   'Tải Xuống',
    'Upload':                     'Tải Lên',
    'Preview':                    'Xem Trước',
    'Required':                   'Bắt Buộc',
    'Optional':                   'Tuỳ Chọn',
    'Yes':                        'Có',
    'No':                         'Không',
    'All':                        'Tất Cả',
    'None':                       'Không Có',
    'Others':                     'Nhóm Khác',
    'Other':                      'Khác',
  };

  // Translate a string. Falls back to the key itself.
  window._t = function (key) {
    if (!key) return key;
    if (_getLang() === 'en') return key;
    return _VI[key] || key;
  };

  // ---- Auto text-node translation ----
  // WeakMap stores original EN text so switching back to EN always restores correctly.
  const _origText = new WeakMap();
  const _SKIP_TAGS = new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','CODE','PRE']);

  function _translateNode(node) {
    const p = node.parentElement;
    if (!p || _SKIP_TAGS.has(p.nodeName) || p.closest('script,style,textarea,input,code,pre')) return;
    if (!_origText.has(node)) _origText.set(node, node.textContent);
    const orig = _origText.get(node);
    const trimmed = orig.trim();
    if (!trimmed || KEEP_EN.has(trimmed)) return;
    const vi = _VI[trimmed];
    if (vi) node.textContent = orig.replace(trimmed, vi);
  }

  function _restoreNode(node) {
    if (_origText.has(node)) node.textContent = _origText.get(node);
  }

  function _walkBody(fn) {
    if (!document.body) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(fn);
  }

  // MutationObserver: translate newly-added nodes when VI is active
  let _mo = null;
  function _startObserver() {
    if (_mo) return;
    _mo = new MutationObserver(mutations => {
      if (_getLang() !== 'vi') return;
      mutations.forEach(m => m.addedNodes.forEach(node => {
        if (node.nodeType === 3) { // TEXT_NODE
          _translateNode(node);
        } else if (node.nodeType === 1 && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
          const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
          let n;
          while ((n = w.nextNode())) _translateNode(n);
        }
      }));
    });
    _mo.observe(document.body, { childList: true, subtree: true });
  }

  // Apply lang to all text nodes on page (data-i18n + auto-scan)
  window._applyLang = function (lang) {
    document.documentElement.lang = lang === 'vi' ? 'vi' : 'en';
    // Explicit data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = (lang === 'vi' && _VI[key]) ? _VI[key] : key;
    });
    // Auto-scan all text nodes
    if (lang === 'vi') {
      _walkBody(_translateNode);
      _startObserver();
    } else {
      _walkBody(_restoreNode);
    }
  };

  // ---- Lang Switcher Button ----
  function _buildSwitcher(currentLang) {
    const wrap = document.createElement('div');
    wrap.className = 'lang-switcher';
    wrap.id = '_wmtLangSwitcher';
    wrap.innerHTML = `
      <button class="lang-btn${currentLang === 'en' ? ' active' : ''}" id="_langBtnEN" onclick="window._setLang('en')">EN</button>
      <button class="lang-btn${currentLang === 'vi' ? ' active' : ''}" id="_langBtnVI" onclick="window._setLang('vi')">VI</button>
    `;
    return wrap;
  }

  function _injectSwitcher(lang) {
    if (document.getElementById('_wmtLangSwitcher')) return;
    const tba = document.querySelector('.top-bar-actions');
    if (tba) {
      tba.appendChild(_buildSwitcher(lang));
    } else {
      const tb = document.querySelector('.top-bar');
      if (tb) {
        const sw = _buildSwitcher(lang);
        sw.style.marginLeft = 'auto';
        tb.appendChild(sw);
      }
    }
  }

  window._updateSwitcherUI = function (lang) {
    const en = document.getElementById('_langBtnEN');
    const vi = document.getElementById('_langBtnVI');
    if (en) en.classList.toggle('active', lang === 'en');
    if (vi) vi.classList.toggle('active', lang === 'vi');
  };

  // ---- Per-question translation (taketest.html MCQ) ----
  let _qvi = null; // cached q_vi.json

  window._loadQvi = async function () {
    if (_qvi !== null) return _qvi;
    try {
      const r = await fetch('q_vi.json');
      _qvi = await r.json();
    } catch (_) {
      _qvi = {};
    }
    return _qvi;
  };

  window.toggleQTranslation = async function (btn, qText, optsObj) {
    const card = btn.closest('.q-card');
    if (!card) return;
    let viBlock = card.querySelector('.q-vi-block');

    if (viBlock) {
      // Toggle off
      viBlock.remove();
      btn.classList.remove('active');
      btn.title = 'Xem tiếng Việt';
      return;
    }

    // Toggle on
    btn.classList.add('active');
    btn.title = 'Ẩn tiếng Việt';

    const dict = await _loadQvi();
    const entry = dict[qText];

    viBlock = document.createElement('div');
    viBlock.className = 'q-vi-block';

    if (!entry) {
      viBlock.innerHTML = `<span class="q-vi-na">🌐 Chưa có bản dịch tiếng Việt cho câu hỏi này.</span>`;
    } else {
      const optLines = optsObj
        ? Object.entries(optsObj)
            .filter(([, v]) => v)
            .map(([k, v]) => `<div class="q-vi-opt"><span>${k}.</span> ${entry[k.toLowerCase()] || v}</div>`)
            .join('')
        : '';
      viBlock.innerHTML = `
        <div style="font-weight:600;margin-bottom:6px;">${entry.q || ''}</div>
        ${optLines ? `<div class="q-vi-opts">${optLines}</div>` : ''}
      `;
    }

    // Insert after .q-text
    const qTextEl = card.querySelector('.q-text');
    if (qTextEl) qTextEl.after(viBlock);
    else card.appendChild(viBlock);
  };

  // ---- Init ----
  // Inject the switcher button immediately (synchronous) — lang.js loads after
  // .top-bar is already in the DOM, so no need to wait for DOMContentLoaded.
  // Translations need the full DOM, so those wait for DOMContentLoaded.
  const _initLang = _getLang();
  _injectSwitcher(_initLang);     // inject if not already in HTML
  _updateSwitcherUI(_initLang);  // sync active state (handles static HTML case)

  function _applyWhenReady() {
    _applyLang(_getLang());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _applyWhenReady);
  } else {
    _applyWhenReady();
  }
})();
