# REST API EduClass

Base URL `/api/v1`. Body JSON trừ biểu mẫu tải tệp, dùng `multipart/form-data` trường `file` hoặc JSON khi không đính kèm. Origin của POST/PATCH/DELETE phải là `CLIENT_URL`. Phiên JWT gửi qua cookie `educlass_session`.

Thành công theo dạng `{"success":true,"message":"…","data":{…}}`. Thất bại theo dạng `{"success":false,"message":"…","errors":[]}`. Với validation, errors có `field` và `message`. Các route tải tệp trả dữ liệu nhị phân và `Content-Disposition` nếu tải xuống.

Ký hiệu A = admin, G = giảng viên lớp, S = sinh viên. “Theo lớp” nghĩa là G sở hữu lớp hoặc S đã ghi danh, với ngoại lệ trang giới thiệu công khai. Danh sách phân trang trả `{items,total,page,limit}`, tham số `page` và `limit` tối đa 30.

| Method và path | Quyền | Dữ liệu gửi | Kết quả |
| --- | --- | --- | --- |
| GET `/health` | Công khai | — | 200 trạng thái |
| POST `/auth/register` | Công khai | `fullName,email,password,confirmPassword` | 201 hồ sơ sinh viên, cookie |
| POST `/auth/login` | Công khai | `email,password` | 200 hồ sơ, cookie |
| POST `/auth/logout` | Có hoặc không có cookie | — | 200 thu hồi phiên và xóa cookie |
| GET `/auth/me`, `/users/me` | Đăng nhập | — | 200 hồ sơ |
| PATCH `/users/me` | Đăng nhập | `fullName` | 200 hồ sơ cập nhật |
| GET `/courses` | Công khai | `search,category,page,limit` | 200 lớp đang mở |
| GET `/categories` | Công khai | — | 200 các danh mục lớp mở |
| GET `/courses/:id` | Công khai với lớp mở, A hoặc theo lớp | — | 200 thông tin và tình trạng ghi danh |
| POST `/courses` | Giảng viên | `title,courseCode,description,category,thumbnail?,status?` | 201 khóa học |
| PATCH/DELETE `/courses/:id` | G | PATCH các trường khóa học | 200 khóa học hoặc null |
| GET `/teacher/courses` | Giảng viên | `search,category,page,limit` | 200 khóa học của mình |
| POST `/courses/:courseId/enroll` | S | — | 201 lượt ghi danh |
| GET `/student/enrollments` | S | `page,limit` | 200 ghi danh kèm tiến độ |
| GET `/courses/:courseId/students` | G | `search,page,limit` | 200 sinh viên, tiến độ, thông tin bài nộp |
| GET `/courses/:courseId/lessons` | Theo lớp | — | 200 bài học và các bài đã hoàn thành |
| POST `/courses/:courseId/lessons` | G | `title,content,order` | 201 bài học |
| PATCH/DELETE `/lessons/:id` | G | PATCH một hoặc nhiều trường | 200 bài học hoặc null |
| POST `/lessons/:id/complete` | S đã ghi danh | — | 200 lessonId |
| GET `/courses/:courseId/materials` | Theo lớp | — | 200 học liệu |
| POST `/courses/:courseId/materials` | G | `title,type,lessonId?`, một trong `file,url,content` | 201 học liệu |
| PATCH/DELETE `/materials/:id` | G | PATCH biểu mẫu học liệu | 200 học liệu hoặc null |
| GET `/materials/:id/download` | Theo lớp | `preview=1` với PDF | 200 nhị phân |
| GET `/courses/:courseId/assignments` | Theo lớp | — | 200 bài tập và số bài nộp hoặc trạng thái cá nhân |
| POST `/courses/:courseId/assignments` | G | `title,description,dueDate,maxScore,allowLateSubmission?,file?` | 201 bài tập |
| GET `/assignments/:id` | Theo lớp | — | 200 yêu cầu và tóm tắt bài nộp cá nhân nếu có |
| PATCH/DELETE `/assignments/:id` | G | PATCH yêu cầu, hạn, chính sách, file hoặc `removeFile` | 200 bài tập hoặc null |
| GET `/assignments/:id/download` | Theo lớp | — | 200 PDF hướng dẫn |
| POST `/assignments/:id/submissions` | S đã ghi danh | `textContent` hoặc `file` | 201 bài nộp |
| GET `/assignments/:id/submissions` | G | `page,limit` | 200 danh sách bài nộp |
| GET `/assignments/:id/my-submission` | S đã ghi danh | — | 200 bài nộp cá nhân hoặc null |
| PATCH `/submissions/:id` | S sở hữu | `textContent?,file?,removeFile?` | 200 bài nộp cập nhật |
| GET `/submissions/:id/download` | Chủ bài nộp hoặc G | — | 200 PDF/TXT |
| PATCH `/submissions/:id/grade` | G | `score,feedback?,published` | 200 bài nộp có điểm |
| GET `/dashboard/admin`, `/dashboard/teacher`, `/dashboard/student` | Tương ứng vai trò | — | 200 số liệu theo vai trò |
| GET `/admin/users` | A | `search,role,isActive,page,limit` | 200 phân trang người dùng |
| GET `/admin/users/:id` | A | — | 200 hồ sơ |
| PATCH `/admin/users/:id/status` | A | `isActive` | 200 hồ sơ cập nhật |
| GET/POST `/admin/teachers` | A | POST `fullName,email,password` | 200 danh sách, 201 hồ sơ |
| GET `/admin/courses` | A | `search,status,teacherId,page,limit` | 200 danh mục toàn hệ thống |
| PATCH `/admin/courses/:id/status` | A | `status` | 200 khóa học cập nhật |

`dueDate` là ISO 8601 có múi giờ. Các trạng thái là `draft/open/closed/archived`. Các phản hồi thường gặp gồm 400 sai dữ liệu, 401 phiên thiếu/hết hạn, 403 tài khoản khóa hoặc quyền bị từ chối, 404 chưa có tài nguyên công khai hoặc đã xóa, 409 xung đột nghiệp vụ/dữ liệu, 413 tệp quá 8 MB, 429 giới hạn tần suất, 500 lỗi máy chủ.

## Ví dụ

```http
PATCH /api/v1/submissions/ID_BAI_NOP/grade HTTP/1.1
Origin: http://localhost:5173
Content-Type: application/json
Cookie: educlass_session=PHIEN_GIANG_VIEN

{"score":0,"feedback":"Cần bổ sung phần kiểm thử.","published":true}
```

Response 200 có `data.score` bằng 0 và `data.published` bằng true. Với `published:false`, sinh viên vẫn thấy thông tin đã nộp nhưng `score` là null và phản hồi nháp bị lược khỏi kết quả. Để gọi từ Postman, đặt Origin theo cấu hình và dùng cookie được thiết lập khi đăng nhập.
