# Kiểm thử EduClass

Windows, Node.js 24, MongoDB Community 8.3, Express 5, React 19, Chrome và Playwright. API test gọi Express qua HTTP và ghi vào cơ sở dữ liệu MongoDB tên ngẫu nhiên. Trình duyệt dùng dữ liệu seed và tương tác qua nhãn accessibility.

```text
npm run lint
npm test
npm run build
node scripts/browser-check.mjs
```

Để chạy thêm UI06, dùng cơ sở dữ liệu demo mới và chạy lệnh trình duyệt với tham số --acceptance. Ca này tạo khóa học, hồ sơ sinh viên và bài nộp nghiệm thu thật.

Kiểm tra npm audit với dependency runtime báo 0 lỗ hổng đã biết tại thời điểm chạy.

## Kết quả API

| Nhóm | Kỳ vọng và kết quả thực tế | Trạng thái |
| --- | --- | --- |
| TC01 · Xác thực | Đăng ký 201 và luôn là student. JWT trong cookie HttpOnly. Sai mật khẩu, thiếu token và token sai trả 401. Trùng email trả 409. Role sai và Origin sai trả 403. Không trả hash. | PASS |
| TC02 · Khóa học | Tạo, sửa, lọc, xóa bản nháp. Sai vai trò/chủ sở hữu nhận 403. Khóa chưa mở không cho ghi danh. Mã trùng trả 409. | PASS |
| TC03 · Ghi danh | Ghi danh trả 201, trùng trả 409, chưa ghi danh bị từ chối nội dung. Hoàn thành hai lần lưu một ID, tiến độ 100%. | PASS |
| TC04 · Tài liệu | PDF tải lại đúng byte, xem trước có MIME PDF. PDF sai nội dung bị chặn. Tạo video link, chuyển thành bài đọc, xóa PDF và dọn tệp. | PASS |
| TC05 · Bài tập và bài nộp | Tạo bài tập có PDF, sửa, nộp text/TXT, cập nhật, từ chối nộp trùng/quá hạn và chặn truy cập bài nộp khác. Cờ nộp trễ đúng theo chính sách. | PASS |
| TC06 · Chấm điểm | Tìm sinh viên theo lớp. Chặn sai vai trò/chủ lớp và điểm ngoài miền. Điểm 0 được công bố nguyên vẹn. Điểm và nhận xét nháp được ẩn. | PASS |
| TC07 · Admin và phiên | Lọc, phân trang, tạo giảng viên, khóa/mở tài khoản. Tài khoản bị khóa trả 403. Kiểm duyệt lớp và thu hồi token khi đăng xuất. | PASS |

Node báo 8 test đạt, gồm bảy ca con và một nhóm cha. [Mã kiểm thử API](../server/test/workflow.test.js)

## Kết quả trình duyệt

| Nhóm | Thao tác quan sát | Trạng thái |
| --- | --- | --- |
| UI01 | Danh mục từ API, form đăng ký/đăng nhập, chuyển hướng khách tới đăng nhập. | PASS |
| UI02 | Dashboard admin, lọc vai trò, hồ sơ chi tiết, hủy thay đổi trạng thái lớp. | PASS |
| UI03 | Tạo/xóa lớp bản nháp, xem trước và tải PDF, mở bảng sinh viên và biểu mẫu chấm. | PASS |
| UI04 | Tìm lớp, chuyển bài học, mở form nộp bài, xem điểm 8.5/10, từ chối route admin. | PASS |
| UI05 | Trang chủ và dashboard ở 375, 390, 768, 1024, 1440 px. Menu mobile hoạt động, không tràn ngang, không lỗi JavaScript/API 5xx trong các ca chạy. | PASS |
| UI06 | Nghiệm thu bản build với Express và MongoDB riêng. Tạo lớp, bài học, tài liệu và bài tập. Đăng ký, ghi danh, tải PDF và nộp bài có tệp. Giảng viên công bố 9.25/10. Admin khóa rồi mở tài khoản, API lần lượt trả 403 và 200. | PASS |

Một lần chạy ban đầu phát hiện nhãn select bị đọc kèm nội dung lựa chọn. Form đã dùng ID riêng để liên kết nhãn với điều khiển, sau đó chạy lại bằng Chrome. Lần chạy bản build phát hiện thư mục upload có đoạn đường dẫn bắt đầu bằng dấu chấm bị middleware gửi file từ chối. Tệp hiện được gửi từ root upload đã cấu hình bằng khóa lưu trữ cố định, kèm ca hồi quy TC04. [Mã kiểm thử trình duyệt](../scripts/browser-check.mjs) · [Ảnh minh chứng](screenshots/)

Trang chủ đạt Taste Skill Gate với 0 lỗi chặn, 14 cảnh báo và không có miễn trừ. Các cảnh báo gồm cách nhận diện nhãn tiếng Việt của bộ kiểm tra, trạng thái 401 khi khách kiểm tra phiên và chi tiết trình bày.

Giới hạn xác minh gồm tải lớn, quét file bằng phần mềm chống mã độc, production và nhiều engine trình duyệt.
