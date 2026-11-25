# Kịch bản demo và bảo vệ EduClass

## Demo 12 phút

| Thời gian | Vai trò và thao tác | Điểm cần trình bày |
| --- | --- | --- |
| 0:00–1:00 | Mở trang chủ và danh mục. | EduClass phục vụ ba vai trò. Danh mục và số lớp mở lấy từ API. |
| 1:00–3:00 | Đăng nhập giảng viên. Tạo lớp bản nháp, thêm bài học, PDF hoặc bài đọc, tạo bài tập. Mở ghi danh. | Tài nguyên gắn với chủ lớp. File nằm ngoài thư mục public. |
| 3:00–5:30 | Dùng phiên trình duyệt khác để đăng ký sinh viên. Tìm lớp vừa tạo, ghi danh, đọc và hoàn thành bài học. | Enrollment nối User với Course và lưu tiến độ. |
| 5:30–7:30 | Mở bài tập, gửi văn bản hoặc PDF/TXT. Mở lại bài đã nộp. | Hạn nộp do server kiểm tra. Một bài nộp hiện hành trên một bài tập. |
| 7:30–9:30 | Quay lại phiên giảng viên, mở danh sách lớp và bài nộp, nhập điểm và nhận xét. Lưu nháp rồi công bố. | Sinh viên chỉ thấy điểm đã công bố. Thử điểm 0 hoặc một điểm hợp lệ. |
| 9:30–11:00 | Xem điểm bằng phiên sinh viên. Đăng nhập admin, khóa rồi mở tài khoản sinh viên vừa đăng ký. | Tài khoản khóa bị chặn ở backend. Trạng thái đổi qua hộp thoại xác nhận. |
| 11:00–12:00 | Mở sơ đồ dữ liệu, route và kết quả kiểm thử. | Giải thích unique index, session TTL, tài nguyên ngoài thư mục public. |

Dùng cửa sổ hoặc hồ sơ trình duyệt riêng cho từng vai trò vì các tab cùng origin chia sẻ cookie. Chuẩn bị sẵn `server/assets/huong-dan-mern.pdf`, cấu hình MongoDB và tài khoản seed. Có thể demo màn hình có dữ liệu ngay với lớp WEB301 nếu thời gian hạn chế.

## 30 câu hỏi và trả lời

1. **Mỗi thành phần MERN có vai trò gì?** React xử lý giao diện. Node chạy Express. MongoDB lưu hồ sơ, Mongoose ánh xạ và kiểm tra schema.
2. **Tại sao chọn monorepo?** Cài dependency và chạy script từ gốc, đồng thời vẫn có package, cấu hình và mã riêng cho client/server.
3. **Luồng đăng ký đi qua những bước nào?** Zod kiểm tra, email được chuẩn hóa, bcrypt hash, Mongoose tạo User và backend cấp phiên sinh viên.
4. **Vì sao không truyền role khi đăng ký?** Controller áp vai trò sinh viên và bỏ trường ngoài schema. Admin cấp tài khoản giảng viên.
5. **Authentication và authorization khác nhau thế nào?** Xác thực trả lời ai đang gọi. Phân quyền trả lời người đó có quyền với hành động và tài nguyên hay không.
6. **Trong JWT lưu gì?** `sub`, `jti`, `iss`, `iat`, `exp`. Vai trò và trạng thái đọc từ User hiện tại.
7. **JWT được lưu ở đâu?** Cookie HttpOnly, SameSite=Lax và bật Secure khi production. JavaScript không cần quản lý token.
8. **Đăng xuất thay đổi gì?** Xóa bản ghi phiên và cookie. Middleware từ chối token cũ do phiên không còn.
9. **TTL làm gì?** MongoDB dọn session sau `expiresAt`. Kiểm tra hết hạn tại API có hiệu lực kể cả trước khi TTL dọn.
10. **Tài khoản bị khóa còn truy cập được không?** Middleware đọc `isActive` cho mỗi request và trả 403 khi tài khoản bị khóa.
11. **Backend biết chủ lớp thế nào?** `courseAccess` so `teacherId` với User được xác thực. Giảng viên khác không có quyền sửa.
12. **Tại sao kiểm tra cả quyền và quyền sở hữu?** Hai người có thể cùng vai trò teacher nhưng chỉ người phụ trách lớp có thể sửa dữ liệu của lớp đó.
13. **Biện pháp CSRF là gì?** Yêu cầu thay đổi dữ liệu kiểm tra Origin khớp cấu hình, cùng cookie SameSite=Lax.
14. **Ghi danh lưu ở đâu?** Enrollment chứa `studentId`, `courseId`, ngày ghi danh và danh sách bài đã hoàn thành.
15. **Chống ghi danh trùng thế nào?** Index unique trên cặp sinh viên và lớp. Lỗi duplicate được đổi sang HTTP 409.
16. **Tính tiến độ thế nào?** Tỷ lệ dựa trên số bài còn hiệu lực đã hoàn thành và tổng số bài còn hiệu lực, làm tròn theo phần trăm.
17. **Khóa học đóng tác động gì?** Dừng ghi danh mới và nộp bài. Người đã ghi danh có thể đọc lại và xem điểm.
18. **Vì sao có xóa mềm?** Duy trì tham chiếu và loại dữ liệu đã xóa khỏi truy vấn thường. Bản nháp được xóa khi chưa có ghi danh.
19. **Bài tập và bài nộp liên kết thế nào?** Submission tham chiếu Assignment. Một Assignment chứa nhiều bài nộp, mỗi sinh viên có một bản hiện hành.
20. **Ai quyết định nộp trễ?** Server so thời điểm nộp với `dueDate` và kiểm tra chính sách bài tập.
21. **Lúc nào được nộp lại?** Lớp đang mở, trước hạn, bài thuộc sinh viên hiện tại và chưa có điểm.
22. **Tại sao dùng null cho điểm chưa chấm?** 0 là điểm hợp lệ. Null biểu thị chưa có điểm.
23. **Điểm nháp được ẩn ở đâu?** Controller tạo response cho sinh viên, đặt score về null và lược nhận xét nháp.
24. **Tệp tải lên được kiểm tra thế nào?** Multer giới hạn 8 MB. Controller kiểm tra đuôi, MIME và chữ ký PDF hoặc nội dung UTF-8 của TXT.
25. **Tệp được lưu và tải như thế nào?** Lưu file ngoài public theo UUID. MongoDB lưu metadata. Endpoint kiểm tra quyền mới đọc file.
26. **Nếu MongoDB báo lỗi khi đang cập nhật tệp?** Hệ thống dọn tệp mới. Tệp cũ chỉ được dọn sau khi lần ghi thay thế thành công.
27. **State dùng Context khi nào?** Thông tin tài khoản và trạng thái phiên được chia sẻ qua Auth Context. Form và bộ lọc giữ state riêng.
28. **Frontend xử lý API thế nào?** Axios gửi cookie cùng yêu cầu. Hook dữ liệu hiển thị loading, lỗi hoặc kết quả và hủy request khi đổi màn hình.
29. **Tại sao dùng các HTTP status khác nhau?** Client phân biệt cần đăng nhập (401), thiếu quyền (403), dữ liệu sai (400) và xung đột nghiệp vụ (409).
30. **Giới hạn hiện tại và hướng mở rộng là gì?** Triển khai một máy chủ với kho file cục bộ. Nhiều máy chủ cần kho tệp dùng chung, rate limit tập trung và quy trình backup phục hồi đồng bộ.
