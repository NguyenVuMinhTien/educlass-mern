# Cài đặt, vận hành và nộp mã nguồn

1. Cài [Node.js](https://nodejs.org/en/download), [MongoDB Community Server](https://www.mongodb.com/docs/manual/installation/) và [Git](https://git-scm.com/install/).
2. Chạy MongoDB dưới dạng dịch vụ loopback hoặc dùng Atlas. Clone URL repository thật hoặc giải nén mã nguồn nhận được.
3. Chạy `npm ci`, tạo `server/.env` từ mẫu và sinh JWT secret như [README](../README.md#cài-đặt-và-chạy).
4. Chạy `npm run seed`, rồi `npm run dev`. Dùng `http://localhost:5173` vì Origin phải khớp `CLIENT_URL`.
5. Chạy `npm run lint`, `npm test`, `npm run build` để kiểm tra lại.

| Biến | Ý nghĩa |
| --- | --- |
| `MONGODB_URI` | MongoDB của ứng dụng. Có thể dùng `TEST_MONGODB_URI` riêng cho test. |
| `PORT` | Cổng Express. Mặc định 5000. |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Khóa bí mật ngẫu nhiên ít nhất 32 ký tự và thời hạn token, mặc định `1d`. |
| `CLIENT_URL` | Origin ứng dụng được phép thay đổi dữ liệu và dùng cookie. |
| `UPLOAD_DIR` | Đường dẫn lưu upload. Mặc định `server/uploads/` khi chạy npm. |
| `NODE_ENV` | `production` bật cookie Secure và HSTS. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Dùng khi tạo admin production, với thông tin riêng. |
| `VITE_API_URL`, `API_PROXY_TARGET` | Base URL cho frontend và đích proxy Vite. Giữ cùng origin theo mặc định. |

## Lỗi thường gặp

- MongoDB không kết nối được. Kiểm tra dịch vụ đang lắng nghe, thông tin trong URI, quyền truy cập và cấu hình Atlas.
- Trình duyệt báo “Nguồn yêu cầu không hợp lệ”. Mở đúng địa chỉ `CLIENT_URL` hoặc cập nhật cấu hình và khởi động lại Express.
- Port 5000 hoặc 5173 đang được dùng. Dừng ứng dụng trùng cổng hoặc cấu hình lại server, proxy và origin cùng nhau.
- Tải tệp trả 404 khi di chuyển máy chủ. Kiểm tra thư mục upload theo `UPLOAD_DIR` và phục hồi tệp từ bản sao lưu tương ứng.
- Hạn demo đã qua. Seed giữ nguyên ngày đã tạo. Giảng viên có thể chỉnh hạn nộp ở tab Bài tập. Có thể tạo cơ sở dữ liệu demo mới bằng URI khác.

## Triển khai bản build

`npm run build` ghi vào `client/dist`. Dùng `npm start` để phục vụ cùng origin qua Express. Nên đặt HTTPS ở reverse proxy, giữ `CLIENT_URL` là origin công khai chuẩn, cấu hình xác thực MongoDB và sao lưu dữ liệu. Nếu dùng React qua dev server từ máy khác, cần cấu hình Vite và Origin theo mạng thực tế.

## GitHub và hai tệp nộp

Repository đích là [NguyenVuMinhTien/educlass-mern](https://github.com/NguyenVuMinhTien/educlass-mern). Nếu repo private, cấp quyền giảng viên. Khi dùng Git cục bộ, thêm `origin` và đẩy nhánh `main` theo README. Nộp URL repository thực tế cùng tệp PDF báo cáo trên cổng của trường. Báo cáo có danh sách MSSV được lưu riêng. Dữ liệu seed có thể tái tạo khi clone mã nguồn.
