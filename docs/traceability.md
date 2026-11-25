# Ma trận đối chiếu yêu cầu đề bài

| Mã | Yêu cầu giảng viên | Chức năng và giao diện | API tiêu biểu | Model | Phép thử và minh chứng | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| R01 | Đăng ký, đăng nhập JWT | Đăng ký, đăng nhập, hồ sơ, đăng xuất | `/auth/register`, `/auth/login`, `/auth/logout` | User, Session | TC01, TC07, UI01 · [đăng nhập](screenshots/02-dang-nhap.png) | Completed |
| R02 | Ba vai trò | Điều hướng, dashboard, kiểm soát API | `GET /dashboard/:role` | User, Session | TC01–02, TC06, UI04 · [admin](screenshots/04-dashboard-admin.png), [giảng viên](screenshots/07-dashboard-teacher.png), [sinh viên](screenshots/14-dashboard-student.png) | Completed |
| R03 | Giảng viên CRUD lớp của mình | Danh sách, tạo/sửa/xóa bản nháp | `POST /courses`, `PATCH/DELETE /courses/:id` | Course, Enrollment | TC02, UI03 · [tạo lớp](screenshots/08-tao-khoa-hoc.png), [chi tiết](screenshots/09-chi-tiet-khoa-hoc-giang-vien.png) | Completed |
| R04 | PDF, video link, bài đọc | Tab bài học và tài liệu, upload/xem trước/tải | `/courses/:id/materials`, `/materials/:id/download` | Lesson, Material | TC03–04, UI03 · [học liệu](screenshots/10-quan-ly-hoc-lieu.png) | Completed |
| R05 | Giảng viên tạo bài tập | Hạn, thang điểm, tệp hướng dẫn | `POST /courses/:id/assignments` | Assignment | TC05, UI03 · [tạo bài](screenshots/11-tao-bai-tap.png) | Completed |
| R06 | Xem sinh viên và chấm bài | Bảng sinh viên, bài nộp, điểm, nhận xét | `GET /courses/:id/students`, `PATCH /submissions/:id/grade` | Enrollment, Submission | TC06, UI03 · [danh sách](screenshots/12-danh-sach-sinh-vien.png), [chấm](screenshots/13-cham-diem.png) | Completed |
| R07 | Xem lớp đang mở và ghi danh | Khám phá, lọc/tìm, giới thiệu lớp | `GET /courses`, `POST /courses/:id/enroll` | Course, Enrollment | TC02–03, UI04 · [tìm lớp](screenshots/15-kham-pha-khoa-hoc.png) | Completed |
| R08 | Truy cập bài học và tải tài liệu | Tab Nội dung và Tài liệu, tiến độ | `/courses/:id/lessons`, `/materials/:id/download`, `/lessons/:id/complete` | Lesson, Material, Enrollment | TC03–04, UI03–04 · [trang học](screenshots/17-trang-hoc-tap.png) | Completed |
| R09 | Nộp file/text và xem điểm cá nhân | Form nộp, cập nhật, điểm và phản hồi | `POST /assignments/:id/submissions`, `GET /assignments/:id/my-submission` | Submission, Assignment | TC05–06, UI04 · [nộp](screenshots/18-nop-bai.png), [điểm](screenshots/19-diem-va-nhan-xet.png) | Completed |
| R10 | Admin quản lý và khóa/mở người dùng | Bảng người dùng, lọc và xác nhận | `GET /admin/users`, `PATCH /admin/users/:id/status` | User | TC07, UI02 · [người dùng](screenshots/05-quan-ly-nguoi-dung.png) | Completed |
| R11 | Admin quản lý danh mục toàn hệ thống | Danh mục, trạng thái, tìm/lọc | `GET /admin/courses`, `PATCH /admin/courses/:id/status` | Course | TC07, UI02 · [danh mục](screenshots/06-quan-ly-khoa-hoc-toan-he-thong.png) | Completed |
| R12 | React Hooks, state tập trung, responsive | Context, Hooks, desktop và mobile | REST API | — | Build, UI05 · [mobile](screenshots/21-lop-hoc-tren-dien-thoai.png) | Completed |
| R13 | REST, tách route/controller/model, xử lý lỗi | Middleware và controller nghiệp vụ | Prefix `/api/v1` | Mongoose | TC01–07 · [API](api.md) | Completed |
| R14 | MongoDB và tối thiểu bốn collection | Schema và index | API nghiệp vụ | User, Course, Enrollment, Assignment và 4 model bổ sung | TC01–07 · [ERD](database.md) | Completed |
| R15 | Báo cáo PDF, hướng dẫn và ảnh thật | Báo cáo A4, README, ảnh Chrome | — | — | [README](../README.md) · [ảnh](screenshots/) | Completed |
| R16 | Repository GitHub, README, loại bí mật | Mã nguồn Git, README, ignore rules | — | — | [Hướng dẫn push](installation.md#github-và-hai-tệp-nộp) | Completed · [Repository nộp bài](https://github.com/NguyenVuMinhTien/educlass-mern). |
