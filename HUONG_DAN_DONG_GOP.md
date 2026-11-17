# Hướng Dẫn Chỉnh Sửa Web Training WMT Qua Claude

> Không cần biết lập trình hay Git — chỉ cần chat với Claude.

---

## Bước 1 — Cài Claude Code

1. Truy cập **https://claude.ai/download**
2. Tải về và cài đặt **Claude desktop app**
3. Mở app → đăng nhập bằng tài khoản Claude của bạn
4. Click tab **Code** ở thanh trên cùng

---

## Bước 2 — Mở Project

Trong cửa sổ Claude Code, gõ đúng câu này:

```
Clone repo này về máy và mở cho tôi làm việc:
https://github.com/nguyendang88890-coder/training
```

Claude sẽ tự clone code về máy và sẵn sàng để bạn làm việc.

> **Chỉ làm bước này lần đầu tiên.** Từ lần sau, mở app → chọn lại session cũ hoặc nói:  
> *"Mở lại project training tôi đã clone trước đó"*

---

## Bước 3 — Yêu Cầu Claude Sửa Nội Dung

Chỉ cần gõ nội dung cần sửa bằng tiếng Việt. Claude sẽ tự tìm đúng file và sửa.

### Ví dụ:

**Sửa thông tin trong module:**
```
Trong module1.html, đổi leverage của 51010 từ 1:100 thành 1:200
```

**Thêm nội dung mới:**
```
Thêm vào module3.html một section mới về chính sách hoàn tiền:
- Hoàn tiền 100% nếu chưa đặt lệnh nào
- Không hoàn tiền sau khi đã giao dịch
```

**Sửa câu hỏi quiz:**
```
Trong module2.html, sửa câu hỏi quiz số 3: đổi đáp án đúng thành lựa chọn thứ 2
```

**Sửa nhiều thứ cùng lúc:**
```
Sửa trong module7.html:
1. Đổi hậu quả của Tick Scalping thành: lần 1 reset tài khoản, lần 2 terminate
2. Xóa phần "Special Rules Indonesia" đi
3. Cập nhật ngày sửa cuối thành hôm nay
```

---

## Bước 4 — Kiểm Tra Trước Khi Lưu

Sau khi Claude sửa xong, hỏi lại:

```
Bạn vừa sửa những gì? Tóm tắt cho tôi
```

Nếu cần xem trực tiếp trên trình duyệt, nói:
```
Mở file module1.html lên trình duyệt cho tôi xem thử
```

---

## Bước 5 — Lưu & Đẩy Lên GitHub

Khi đã hài lòng với nội dung, nói:

```
Commit và push lên GitHub giúp tôi
```

Claude sẽ tự đặt tên commit mô tả những gì vừa sửa và push lên.

> ✅ Xong bước này là code đã được lưu trên GitHub.

---

## Bước 6 — Cập Nhật Lên Website Thật (VPS)

Để thay đổi hiển thị trên web thật, nói thêm:

```
Deploy lên VPS giúp tôi
```

> **Lưu ý:** Bước deploy cần có thông tin kết nối VPS. Liên hệ chủ repo để được cấp quyền deploy, hoặc nhờ chủ repo deploy sau khi bạn đã push lên GitHub.

---

## Quy Trình Mỗi Lần Làm Việc

```
Mở Claude Code
    ↓
"Lấy code mới nhất về"  ← luôn làm bước này đầu tiên
    ↓
Nói cho Claude biết cần sửa gì
    ↓
Hỏi lại: "Bạn vừa sửa gì?"
    ↓
"Commit và push lên GitHub"
    ↓
"Deploy lên VPS"  (nếu có quyền)
```

---

## Mẹo Hữu Ích

**Lấy code mới nhất trước khi làm:**
```
Pull code mới nhất từ GitHub về
```

**Nếu Claude sửa sai, có thể hoàn tác:**
```
Hoàn tác thay đổi vừa rồi trong module1.html
```

**Xem danh sách file trong project:**
```
Liệt kê các file HTML trong project này
```

**Muốn sửa nhiều file cùng lúc:**
```
Trong tất cả các file module, đổi chữ "NOPC-EU" thành "NOPC"
```

---

## Danh Sách File Chính

| File | Nội dung |
|------|----------|
| `module1.html` | Sản phẩm & Gói tài khoản |
| `module2.html` | Quy tắc giao dịch |
| `module3.html` | Payout & Profit Share |
| `module4.html` | Cổng thanh toán |
| `module5.html` | Đòn bẩy |
| `module6.html` | Chương trình IP |
| `module7.html` | Tuân thủ & Quy định |
| `exam.html` | Bài kiểm tra cuối khoá |
| `index.html` | Trang chủ |
| `admin.html` | Trang quản trị *(chỉ admin)* |

---

## Liên Hệ Hỗ Trợ

Nếu gặp vấn đề: **ralph.nguyen@wemastertrade.com**
