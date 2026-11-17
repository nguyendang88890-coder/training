# Hướng Dẫn Chỉnh Sửa & Deploy Web Training WMT

> Dành cho cộng tác viên có quyền push lên GitHub.

---

## 1. Cài Đặt Môi Trường

### 1.1 Phần mềm cần có

| Phần mềm | Link tải | Ghi chú |
|----------|----------|---------|
| **Git** | https://git-scm.com/downloads | Chọn Windows 64-bit |
| **Node.js** | https://nodejs.org | Tải bản LTS |
| **Claude Code** | https://claude.ai/download | Desktop app (tab Code) |
| **VS Code** (tùy chọn) | https://code.visualstudio.com | Dùng để xem file nếu cần |

### 1.2 Cài Claude Code

1. Tải và cài **Claude Code desktop app** từ link trên
2. Đăng nhập bằng tài khoản Claude (tạo tại claude.ai nếu chưa có)
3. Mở app → chọn tab **Code** (góc trên cùng)

---

## 2. Lấy Code Về Máy (Lần Đầu)

Mở **Terminal** (CMD hoặc PowerShell) và chạy:

```bash
git clone https://github.com/nguyendang88890-coder/training.git
cd training
```

> Thư mục `training` sẽ được tạo tại vị trí bạn chạy lệnh. Ví dụ nếu chạy từ Desktop thì code sẽ ở `C:\Users\TênMáy\Desktop\training`.

---

## 3. Mở Project Trong Claude Code

1. Mở **Claude Code desktop app**
2. Click **Open Folder** (hoặc kéo thả thư mục `training` vào cửa sổ app)
3. Chọn thư mục `training` vừa clone về
4. Claude Code sẽ load project — bạn có thể bắt đầu chat với Claude ngay trong cửa sổ này

---

## 4. Chỉnh Sửa Nội Dung Qua Claude

Thay vì tự sửa file HTML, hãy **nhờ Claude sửa giúp**. Ví dụ:

### Ví dụ câu lệnh cho Claude:

```
Sửa module1.html: đổi leverage của 51010 từ 1:100 thành 1:200
```

```
Thêm section mới vào module3.html về chính sách hoàn tiền, nội dung như sau: ...
```

```
Trong exam.html, câu hỏi số 5 cần đổi đáp án đúng thành lựa chọn thứ 2
```

```
Xem lại module2.html và dịch các heading còn tiếng Việt sang tiếng Anh
```

### Lưu ý quan trọng:
- Claude sẽ **tự động sửa file** — bạn không cần mở file thủ công
- Chỉ sửa các file trong thư mục `C:\...\training\` (không phải thư mục khác)
- Nếu không chắc Claude sửa đúng chưa, hỏi thêm: *"Bạn vừa sửa gì trong file đó?"*

---

## 5. Kiểm Tra Thay Đổi Trước Khi Push

Trước khi push, kiểm tra lại những gì đã sửa:

```bash
git status
```
→ Xem danh sách file đã thay đổi

```bash
git diff module1.html
```
→ Xem chi tiết thay đổi trong file cụ thể (nhấn `q` để thoát)

Hoặc nhờ Claude kiểm tra:
```
Kiểm tra lại những thay đổi vừa thực hiện và tóm tắt cho tôi
```

---

## 6. Commit & Push Lên GitHub

Sau khi đã kiểm tra xong, nhờ Claude commit và push:

```
Commit và push các thay đổi vừa thực hiện lên GitHub
```

Hoặc tự làm thủ công:

```bash
git add .
git commit -m "mô tả ngắn về thay đổi"
git push origin main
```

> ✅ Sau khi push thành công, code đã lên GitHub tại:
> https://github.com/nguyendang88890-coder/training

---

## 7. Deploy Lên Website (VPS)

Sau khi push lên GitHub, cần chạy thêm bước deploy để cập nhật lên web thật.

Nhờ Claude deploy:
```
Deploy các file vừa thay đổi lên VPS
```

> Claude sẽ dùng script deploy có sẵn trong session để kéo code mới từ GitHub về VPS.

**Hoặc nếu muốn tự deploy:**
- Nhận file `deploy_vps.js` từ chủ repo (file này chứa thông tin kết nối VPS, không public)
- Chạy: `node deploy_vps.js`

---

## 8. Cập Nhật Code Mới Nhất Từ GitHub

Trước khi bắt đầu làm việc mỗi lần, luôn pull code mới nhất về:

```bash
git pull origin main
```

Hoặc nhờ Claude:
```
Pull code mới nhất từ GitHub về
```

---

## 9. Quy Trình Làm Việc Tóm Tắt

```
Mở Claude Code
    ↓
git pull (lấy code mới nhất)
    ↓
Nhờ Claude sửa nội dung
    ↓
Kiểm tra lại thay đổi
    ↓
Commit & push lên GitHub
    ↓
Deploy lên VPS
```

---

## 10. Danh Sách File HTML Chính

| File | Nội dung |
|------|----------|
| `module1.html` | Module 1 — Sản phẩm & Gói tài khoản |
| `module2.html` | Module 2 — Quy tắc giao dịch |
| `module3.html` | Module 3 — Payout & Profit Share |
| `module4.html` | Module 4 — Cổng thanh toán |
| `module5.html` | Module 5 — Đòn bẩy |
| `module6.html` | Module 6 — Chương trình IP |
| `module7.html` | Module 7 — Tuân thủ & Quy định |
| `exam.html` | Bài kiểm tra cuối khoá |
| `admin.html` | Trang quản trị (chỉ admin) |
| `index.html` | Trang chủ / Dashboard |

---

## 11. Hỗ Trợ

Nếu gặp lỗi hoặc không chắc cách làm:
- Hỏi trực tiếp Claude trong session đang mở
- Liên hệ chủ repo: ralph.nguyen@wemastertrade.com
