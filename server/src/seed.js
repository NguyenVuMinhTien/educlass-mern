import mongoose from "mongoose";
import { readFile } from "node:fs/promises";
import { config } from "./config.js";
import { storeFile, removeFile } from "./files.js";
import { createAccount, account } from "./controllers/auth.js";
import {
  Assignment,
  Course,
  Enrollment,
  Lesson,
  Material,
  Submission,
  User,
} from "./models/index.js";

const demoPassword = "EduClass!2026";
const adminAccount = {
  fullName: "Quản trị EduClass",
  email: process.env.ADMIN_EMAIL || "admin@educlass.example",
  password: process.env.ADMIN_PASSWORD || demoPassword,
};
const teachers = ["Nguyễn Minh Anh", "Trần Hoàng Nam", "Lê Thu Hà"];
const students = [
  "Phạm Gia Linh",
  "Bùi Thảo Nguyên",
  "Võ Đức Anh",
  "Nguyễn Thanh Tùng",
  "Trần Bảo Ngọc",
  "Đỗ Nhật Minh",
  "Lê Hải Yến",
  "Hoàng Khánh Vy",
  "Ngô Quang Huy",
  "Vũ Mai Chi",
];
const samples = [
  [
    "WEB301",
    "Lập trình Web MERN Stack",
    "Lập trình Web",
    "Xây dựng ứng dụng web từ giao diện React đến API Express và cơ sở dữ liệu MongoDB.",
    [
      [
        "Kiến trúc ứng dụng MERN",
        "Tách giao diện React, API Express và dữ liệu MongoDB. Theo dõi một yêu cầu GET từ trình duyệt đến cơ sở dữ liệu và ngược lại.",
      ],
      [
        "Thiết kế REST API",
        "Xác định tài nguyên, chọn HTTP method và mã trạng thái. So sánh POST tạo bản ghi với PATCH cập nhật từng trường.",
      ],
      [
        "Kết nối React với API",
        "Dùng Axios để gọi API. Xử lý ba trạng thái chờ dữ liệu, có kết quả và có lỗi.",
      ],
    ],
    "Thiết kế REST API cho thư viện",
  ],
  [
    "JS201",
    "Nền tảng JavaScript",
    "Ngôn ngữ lập trình",
    "Thực hành xử lý dữ liệu với mảng, hàm và lập trình bất đồng bộ.",
    [
      [
        "Mảng và đối tượng",
        "Dùng map để tạo kết quả mới, filter để giữ phần tử phù hợp và reduce khi cần tích lũy giá trị.",
      ],
      [
        "Promise và async/await",
        "Dùng await ở nơi cần dữ liệu trả về và bắt lỗi có thể phục hồi bằng try/catch.",
      ],
    ],
    "Xử lý danh sách sinh viên",
  ],
  [
    "DB203",
    "Cơ sở dữ liệu MongoDB",
    "Cơ sở dữ liệu",
    "Thiết kế document, mô hình hóa quan hệ và dùng index để tăng tốc truy vấn.",
    [
      [
        "Thiết kế document",
        "So sánh nhúng dữ liệu với tham chiếu giữa các collection. Xét cách đọc và cập nhật trước khi quyết định.",
      ],
      [
        "Index và truy vấn",
        "Tạo index cho truy vấn phổ biến. Dùng explain để đọc kế hoạch thực thi và số tài liệu đã quét.",
      ],
    ],
    "Mô hình hóa hệ thống ghi danh",
  ],
  [
    "UX102",
    "Thiết kế giao diện UI/UX",
    "Thiết kế",
    "Xây dựng luồng sử dụng, prototype và kiểm tra khả năng tiếp cận của giao diện.",
    [
      [
        "Luồng người dùng",
        "Mô tả mục tiêu, hành động chính và các trường hợp lỗi trước khi tạo wireframe.",
      ],
      [
        "Kiểm tra khả năng tiếp cận",
        "Duyệt bằng phím Tab, kiểm tra nhãn form và độ tương phản chữ.",
      ],
    ],
    "Thiết kế màn hình ghi danh",
  ],
  [
    "RE211",
    "Phát triển ứng dụng React",
    "Lập trình Web",
    "Tổ chức component, quản lý state và kết nối dữ liệu trong ứng dụng React.",
    [
      [
        "Component và props",
        "Thiết kế component theo trách nhiệm. Dùng props để truyền dữ liệu từ cha xuống con.",
      ],
      [
        "State và hooks",
        "Lưu trạng thái tối thiểu và tính dữ liệu dẫn xuất trong khi render.",
      ],
    ],
    "Xây dựng bộ lọc khóa học",
  ],
  [
    "CS101",
    "Nhập môn lập trình",
    "Ngôn ngữ lập trình",
    "Làm quen với biến, điều kiện, vòng lặp và cách kiểm tra kết quả của chương trình.",
    [
      [
        "Biến và biểu thức",
        "Chọn tên theo ý nghĩa dữ liệu, quan sát kiểu và kiểm tra điều kiện biên.",
      ],
      [
        "Phân rã bài toán",
        "Chia tác vụ thành các hàm nhỏ và kiểm thử với cả trường hợp bình thường lẫn dữ liệu rỗng.",
      ],
    ],
    "Viết hàm tính điểm trung bình",
  ],
];
const future = (days) => new Date(Date.now() + days * 86400_000);
async function user(fields, role) {
  const valid = account.parse(fields);
  const existing = await User.findOne({ email: valid.email });
  if (existing && existing.role !== role)
    throw new Error("Địa chỉ seed đang gắn với vai trò khác.");
  return existing || createAccount(valid, role);
}
const upsert = (model, filter, values) =>
  model.findOneAndUpdate(
    filter,
    { $setOnInsert: values },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      timestamps: false,
    },
  );
async function seed() {
  if (
    config.production &&
    (!process.env.ADMIN_EMAIL ||
      !process.env.ADMIN_PASSWORD ||
      adminAccount.password === demoPassword)
  ) {
    throw new Error(
      "Cấu hình ADMIN_EMAIL và ADMIN_PASSWORD riêng để khởi tạo quản trị.",
    );
  }
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([
    User.init(),
    Course.init(),
    Enrollment.init(),
    Submission.init(),
  ]);
  await user(adminAccount, "admin");
  if (config.production) return console.log("Đã khởi tạo quản trị viên.");
  const teacherRows = await Promise.all(
    teachers.map((fullName, i) =>
      user(
        {
          fullName,
          email: `teacher${i + 1}@educlass.example`,
          password: demoPassword,
        },
        "teacher",
      ),
    ),
  );
  const studentRows = await Promise.all(
    students.map((fullName, i) =>
      user(
        {
          fullName,
          email: `student${i + 1}@educlass.example`,
          password: demoPassword,
        },
        "student",
      ),
    ),
  );
  for (const [
    index,
    [code, title, category, description, lessons, task],
  ] of samples.entries()) {
    const teacherId = teacherRows[index < 3 ? 0 : index < 5 ? 1 : 2].id;
    const course = await upsert(
      Course,
      { courseCode: code },
      {
        title,
        category,
        description,
        teacherId,
        status: index === 5 ? "draft" : "open",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );
    if (course.deletedAt || String(course.teacherId) !== teacherId) continue;
    const courseId = course.id;
    const lessonRows = [];
    for (const [lessonIndex, [lessonTitle, content]] of lessons.entries()) {
      lessonRows.push(
        await upsert(
          Lesson,
          { courseId, title: lessonTitle },
          {
            content,
            order: lessonIndex + 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ),
      );
    }
    const assignment = await upsert(
      Assignment,
      { title: task, courseId },
      {
        teacherId,
        description:
          "Viết bài làm có ví dụ cụ thể. Giải thích cách triển khai và nêu một trường hợp biên cần kiểm tra. Có thể nộp văn bản hoặc tệp PDF/TXT.",
        maxScore: 10,
        dueDate: future(index + 4),
        allowLateSubmission: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );
    await upsert(
      Material,
      { courseId, title: "Ghi chú bài học" },
      {
        uploadedBy: teacherId,
        lessonId: lessonRows[0].id,
        type: "text",
        content: lessons[0][1],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );
    if (
      index === 0 &&
      !(await Material.exists({ courseId, title: "Tài liệu hướng dẫn dự án" }))
    ) {
      const buffer = await readFile(
        new URL("../assets/huong-dan-mern.pdf", import.meta.url),
      );
      const file = await storeFile(
        {
          originalname: "huong-dan-mern.pdf",
          mimetype: "application/pdf",
          size: buffer.length,
          buffer,
        },
        config,
        true,
      );
      try {
        await Material.create({
          courseId,
          lessonId: lessonRows[0].id,
          title: "Tài liệu hướng dẫn dự án",
          type: "pdf",
          uploadedBy: teacherId,
          file,
        });
      } catch (error) {
        await removeFile(file, config);
        throw error;
      }
    }
    const selected =
      index < 2 ? [0, 1, 2] : index < 5 ? [index, index + 4] : [];
    for (const studentIndex of selected) {
      const studentId = studentRows[studentIndex].id;
      await upsert(
        Enrollment,
        { courseId, studentId },
        {
          completedLessonIds: studentIndex === 0 ? [lessonRows[0].id] : [],
          enrolledAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      );
      if (index === 0 && studentIndex < 3) {
        await upsert(
          Submission,
          { studentId, assignmentId: assignment.id },
          {
            textContent:
              "Em dùng GET /books để lấy danh sách và POST /books để thêm tài liệu. Khi mã tài liệu bị trùng, API trả HTTP 409.",
            submittedAt: new Date(),
            ...(studentIndex === 0
              ? {
                  score: 8.5,
                  published: true,
                  gradedBy: teacherId,
                  gradedAt: new Date(),
                  feedback:
                    "Luồng xử lý rõ ràng. Bổ sung ví dụ khi người dùng gửi dữ liệu thiếu.",
                }
              : {}),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        );
      }
    }
  }
  console.log("Đã khởi tạo dữ liệu EduClass.");
}
try {
  await seed();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
