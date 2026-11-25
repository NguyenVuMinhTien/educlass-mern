import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import mongoose from "mongoose";
import { buildApp } from "../src/app.js";
import { createAccount } from "../src/controllers/auth.js";
import { config } from "../src/config.js";
import {
  Assignment,
  Course,
  Enrollment,
  Lesson,
  Material,
  Session,
  Submission,
  User,
} from "../src/models/index.js";

const models = [
  Assignment,
  Course,
  Enrollment,
  Lesson,
  Material,
  Session,
  Submission,
  User,
];
const origin = "http://localhost:5173";
const password = "Classroom!Test2026";
const loginFields = (name) => ({ email: name + "@educlass.example", password });
const credentials = (name) => ({
  ...loginFields(name),
  fullName: name + " EduClass",
});
const draft = {
  title: "Kiểm thử MERN",
  courseCode: "QATEST",
  description: "Khóa học dùng kiểm tra toàn bộ luồng.",
  category: "Lập trình Web",
};
const lessonInfo = {
  title: "Mô hình MERN",
  order: 1,
  content: "Nội dung bài học có thể tải từ máy chủ.",
};

test("Luồng EduClass với MongoDB thật", async (t) => {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "educlass-test-"),
  );
  const uploadDir = path.join(temporaryDirectory, ".protected");
  const dbName = "educlass_test_" + randomUUID().replaceAll("-", "");
  let server;
  t.after(async () => {
    try {
      if (server?.listening)
        await new Promise((resolve) => server.close(resolve));
      if (
        mongoose.connection.readyState === 1 &&
        mongoose.connection.name === dbName
      )
        await mongoose.connection.dropDatabase();
    } finally {
      await mongoose.disconnect();
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
  await mongoose.connect(process.env.TEST_MONGODB_URI || config.mongoUri, {
    dbName,
    serverSelectionTimeoutMS: 5000,
  });
  await Promise.all(models.map((model) => model.init()));
  const application = buildApp({
    ...config,
    production: false,
    clientOrigin: origin,
    jwtSecret: "test-only-" + randomUUID(),
    uploadDir,
  });
  server = application.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const pdf = await readFile(
    new URL("../assets/huong-dan-mern.pdf", import.meta.url),
  );
  const form = (fields, file) => {
    const payload = new FormData();
    for (const [key, value] of Object.entries(fields)) payload.set(key, value);
    if (file)
      payload.set(
        "file",
        new Blob([file.content], { type: file.mime }),
        file.name,
      );
    return payload;
  };
  const pdfFile = {
    content: pdf,
    mime: "application/pdf",
    name: "huong-dan.pdf",
  };
  async function request(
    method,
    route,
    {
      data,
      cookie,
      expected = 200,
      requestOrigin = origin,
      binary = false,
    } = {},
  ) {
    const headers = { origin: requestOrigin };
    if (cookie) headers.cookie = cookie;
    if (data && !(data instanceof FormData))
      headers["content-type"] = "application/json";
    const response = await fetch(base + route, {
      method,
      headers,
      body: data && (data instanceof FormData ? data : JSON.stringify(data)),
    });
    const body = binary
      ? Buffer.from(await response.arrayBuffer())
      : await response.json();
    assert.equal(
      response.status,
      expected,
      method + " " + route + ": " + (binary ? "" : JSON.stringify(body)),
    );
    if (!binary) assert.equal(body.success, expected < 400);
    return {
      data: binary ? body : body.data,
      headers: response.headers,
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  }
  const login = (name, expected = 200) =>
    request("POST", "/auth/login", { data: loginFields(name), expected });
  const register = (name, extras = {}, expected = 201) =>
    request("POST", "/auth/register", {
      data: { ...credentials(name), confirmPassword: password, ...extras },
      expected,
    });

  let admin,
    teacher,
    otherTeacher,
    student,
    otherStudent,
    course,
    lesson,
    material,
    assignment,
    submission,
    fileSubmission;
  await t.test(
    "TC01 · Xác thực, hash, cookie, trùng email và quyền đăng ký",
    async () => {
      await createAccount(credentials("admin"), "admin");
      await createAccount(credentials("teacher"), "teacher");
      await createAccount(credentials("teacher2"), "teacher");
      [admin, teacher, otherTeacher] = await Promise.all(
        ["admin", "teacher", "teacher2"].map((name) => login(name)),
      );
      student = await register("student", { role: "admin" });
      otherStudent = await register("student2");
      assert.equal(student.data.role, "student");
      assert.match(student.headers.get("set-cookie"), /HttpOnly/i);
      assert.match(student.headers.get("set-cookie"), /SameSite=Lax/i);
      assert.equal(student.data.passwordHash, undefined);
      assert.notEqual(
        (await User.findById(student.data._id).select("+passwordHash"))
          .passwordHash,
        password,
      );
      await register("student", {}, 409);
      await register("different", { confirmPassword: "khac-mat-khau" }, 400);
      await request("POST", "/auth/login", {
        data: { ...loginFields("student"), password: "sai-mat-khau" },
        expected: 401,
      });
      await request("GET", "/auth/me", { expected: 401 });
      await request("GET", "/auth/me", {
        cookie: "educlass_session=invalid",
        expected: 401,
      });
      await request("GET", "/admin/users", {
        cookie: student.cookie,
        expected: 403,
      });
      await request("PATCH", "/users/me", {
        cookie: student.cookie,
        requestOrigin: "http://localhost:6000",
        data: { fullName: "Tên khác" },
        expected: 403,
      });
      const { data: profile } = await request("PATCH", "/users/me", {
        cookie: student.cookie,
        data: { fullName: "Sinh viên Kiểm thử" },
      });
      assert.equal(profile.fullName, "Sinh viên Kiểm thử");
    },
  );
  await t.test(
    "TC02 · CRUD khóa học, bộ lọc, sở hữu và mã duy nhất",
    async () => {
      course = (
        await request("POST", "/courses", {
          data: draft,
          cookie: teacher.cookie,
          expected: 201,
        })
      ).data;
      await request("GET", "/courses/" + course._id, { expected: 404 });
      await request("POST", "/courses", {
        data: draft,
        cookie: student.cookie,
        expected: 403,
      });
      await request("POST", "/courses", {
        data: draft,
        cookie: teacher.cookie,
        expected: 409,
      });
      await request("PATCH", "/courses/" + course._id, {
        data: { status: "open" },
        cookie: otherTeacher.cookie,
        expected: 403,
      });
      await request("POST", "/courses/" + course._id + "/enroll", {
        cookie: student.cookie,
        expected: 409,
      });
      await request("PATCH", "/courses/" + course._id, {
        data: { status: "open" },
        cookie: teacher.cookie,
      });
      const { data } = await request(
        "GET",
        "/courses?search=QATEST&category=" + encodeURIComponent(draft.category),
      );
      assert.equal(data.items[0]._id, course._id);
      assert.equal(data.items[0].teacherId.fullName, "teacher EduClass");
      const disposable = (
        await request("POST", "/courses", {
          data: { ...draft, courseCode: "DELETE1" },
          cookie: teacher.cookie,
          expected: 201,
        })
      ).data;
      await request("DELETE", "/courses/" + disposable._id, {
        cookie: teacher.cookie,
      });
      await request("GET", "/courses/" + disposable._id, {
        cookie: teacher.cookie,
        expected: 404,
      });
      await request("GET", "/courses/khong-hop-le", { expected: 400 });
    },
  );
  await t.test(
    "TC03 · Ghi danh, tải dữ liệu đúng quyền và tiến độ",
    async () => {
      const url = "/courses/" + course._id;
      await request("GET", url + "/lessons", {
        cookie: student.cookie,
        expected: 403,
      });
      await request("GET", url + "/lessons", { expected: 401 });
      await request("POST", url + "/enroll", {
        cookie: student.cookie,
        expected: 201,
      });
      await request("POST", url + "/enroll", {
        cookie: student.cookie,
        expected: 409,
      });
      await request("POST", url + "/enroll", {
        cookie: otherStudent.cookie,
        expected: 201,
      });
      lesson = (
        await request("POST", url + "/lessons", {
          data: lessonInfo,
          cookie: teacher.cookie,
          expected: 201,
        })
      ).data;
      await request("PATCH", "/lessons/" + lesson._id, {
        data: { order: 2 },
        cookie: teacher.cookie,
      });
      const { data: contents } = await request("GET", url + "/lessons", {
        cookie: student.cookie,
      });
      assert.equal(contents.lessons[0].order, 2);
      await request("POST", "/lessons/" + lesson._id + "/complete", {
        cookie: student.cookie,
      });
      await request("POST", "/lessons/" + lesson._id + "/complete", {
        cookie: student.cookie,
      });
      const { data } = await request("GET", "/student/enrollments", {
        cookie: student.cookie,
      });
      assert.equal(data.items[0].progress, 100);
      assert.equal(data.items[0].completedLessonIds.length, 1);
      const extra = (
        await request("POST", url + "/lessons", {
          data: { ...lessonInfo, title: "Bài học xóa" },
          cookie: teacher.cookie,
          expected: 201,
        })
      ).data;
      await request("DELETE", "/lessons/" + extra._id, {
        cookie: teacher.cookie,
      });
      await request("POST", "/lessons/" + extra._id + "/complete", {
        cookie: student.cookie,
        expected: 404,
      });
    },
  );
  await t.test(
    "TC04 · PDF, video, bài đọc, tệp sai định dạng và xóa tệp",
    async () => {
      const url = "/courses/" + course._id + "/materials";
      material = (
        await request("POST", url, {
          data: form(
            { title: "PDF mẫu", type: "pdf", lessonId: lesson._id },
            pdfFile,
          ),
          cookie: teacher.cookie,
          expected: 201,
        })
      ).data;
      assert.equal(material.file.key, undefined);
      const materialUrl = "/materials/" + material._id;
      await request("GET", materialUrl + "/download", {
        cookie: otherTeacher.cookie,
        expected: 403,
      });
      const downloaded = await request("GET", materialUrl + "/download", {
        cookie: student.cookie,
        binary: true,
      });
      assert.deepEqual(downloaded.data, pdf);
      assert.match(
        downloaded.headers.get("content-disposition"),
        /^attachment/i,
      );
      const preview = await request(
        "GET",
        materialUrl + "/download?preview=1",
        { cookie: student.cookie, binary: true },
      );
      assert.match(preview.headers.get("content-type"), /application\/pdf/i);
      await request("POST", url, {
        data: form(
          { title: "PDF sai", type: "pdf" },
          { ...pdfFile, content: "Tệp văn bản" },
        ),
        cookie: teacher.cookie,
        expected: 400,
      });
      const video = (
        await request("POST", url, {
          data: {
            title: "Video",
            type: "video",
            url: "https://example.com/video",
          },
          cookie: teacher.cookie,
          expected: 201,
        })
      ).data;
      await request("PATCH", "/materials/" + video._id, {
        data: { title: "Bài đọc", type: "text", content: "Nội dung bài đọc." },
        cookie: teacher.cookie,
      });
      const rows = (await request("GET", url, { cookie: student.cookie })).data;
      assert.equal(
        rows.find((row) => row._id === video._id).content,
        "Nội dung bài đọc.",
      );
      await request("DELETE", materialUrl, { cookie: teacher.cookie });
      assert.deepEqual(await readdir(uploadDir), []);
      await request("GET", materialUrl + "/download", {
        cookie: student.cookie,
        expected: 404,
      });
    },
  );
  await t.test(
    "TC05 · Bài tập, văn bản, file, nộp lại và hạn nộp",
    async () => {
      const url = "/courses/" + course._id + "/assignments";
      const fields = {
        title: "Thiết kế API",
        description: "Mô tả API và ví dụ.",
        dueDate: new Date(Date.now() + 86400_000).toISOString(),
        maxScore: 10,
      };
      assignment = (
        await request("POST", url, {
          data: form(fields, pdfFile),
          cookie: teacher.cookie,
          expected: 201,
        })
      ).data;
      const route = "/assignments/" + assignment._id;
      assert.deepEqual(
        (
          await request("GET", route + "/download", {
            cookie: student.cookie,
            binary: true,
          })
        ).data,
        pdf,
      );
      await request("PATCH", route, {
        data: { description: "Yêu cầu cập nhật." },
        cookie: teacher.cookie,
      });
      await request("POST", route + "/submissions", {
        data: {},
        cookie: student.cookie,
        expected: 400,
      });
      submission = (
        await request("POST", route + "/submissions", {
          data: { textContent: "Bản nháp thứ nhất", score: 10 },
          cookie: student.cookie,
          expected: 201,
        })
      ).data;
      assert.equal(submission.score, null);
      await request("PATCH", "/submissions/" + submission._id, {
        data: { textContent: "Bài cập nhật" },
        cookie: student.cookie,
      });
      await request("POST", route + "/submissions", {
        data: { textContent: "Bài trùng" },
        cookie: student.cookie,
        expected: 409,
      });
      fileSubmission = (
        await request("POST", route + "/submissions", {
          data: form(
            {},
            {
              name: "bai-lam.txt",
              mime: "text/plain",
              content: "Bài làm qua tệp",
            },
          ),
          cookie: otherStudent.cookie,
          expected: 201,
        })
      ).data;
      await request("GET", "/submissions/" + fileSubmission._id + "/download", {
        cookie: student.cookie,
        expected: 403,
      });
      const downloaded = await request(
        "GET",
        "/submissions/" + fileSubmission._id + "/download",
        { cookie: teacher.cookie, binary: true },
      );
      assert.equal(downloaded.data.toString(), "Bài làm qua tệp");
      await request("PATCH", "/submissions/" + fileSubmission._id, {
        data: { textContent: "Bài khác" },
        cookie: student.cookie,
        expected: 403,
      });
      await request("DELETE", route, { cookie: teacher.cookie, expected: 409 });
      const late = (
        await request("POST", url, {
          data: { ...fields, title: "Bài thử quá hạn" },
          cookie: teacher.cookie,
          expected: 201,
        })
      ).data;
      await request("PATCH", "/assignments/" + late._id, {
        data: { dueDate: "2020-01-01T10:00:00Z" },
        cookie: teacher.cookie,
      });
      await request("POST", "/assignments/" + late._id + "/submissions", {
        data: { textContent: "Không được nộp" },
        cookie: student.cookie,
        expected: 409,
      });
      await request("PATCH", "/assignments/" + late._id, {
        data: { allowLateSubmission: true },
        cookie: teacher.cookie,
      });
      const { data: lateSubmission } = await request(
        "POST",
        "/assignments/" + late._id + "/submissions",
        {
          data: { textContent: "Được nộp trễ" },
          cookie: student.cookie,
          expected: 201,
        },
      );
      assert.equal(lateSubmission.isLate, true);
      await request("PATCH", "/submissions/" + lateSubmission._id, {
        data: { textContent: "Không được nộp lại" },
        cookie: student.cookie,
        expected: 409,
      });
      const disposable = (
        await request("POST", url, {
          data: { ...fields, title: "Bài tập xóa" },
          cookie: teacher.cookie,
          expected: 201,
        })
      ).data;
      await request("DELETE", "/assignments/" + disposable._id, {
        cookie: teacher.cookie,
      });
      await request("GET", "/assignments/" + disposable._id, {
        cookie: teacher.cookie,
        expected: 404,
      });
    },
  );
  await t.test(
    "TC06 · Danh sách sinh viên, ranh giới quyền và công bố điểm 0",
    async () => {
      const roster = await request(
        "GET",
        "/courses/" + course._id + "/students?search=student2",
        { cookie: teacher.cookie },
      );
      assert.equal(roster.data.items[0].studentId._id, otherStudent.data._id);
      const url = "/submissions/" + submission._id + "/grade";
      await request("PATCH", url, {
        data: { score: 9, published: true },
        cookie: student.cookie,
        expected: 403,
      });
      await request("PATCH", url, {
        data: { score: 9, published: true },
        cookie: otherTeacher.cookie,
        expected: 403,
      });
      await request("PATCH", url, {
        data: { score: 11, published: true },
        cookie: teacher.cookie,
        expected: 400,
      });
      await request("PATCH", url, {
        data: { score: -1, published: true },
        cookie: teacher.cookie,
        expected: 400,
      });
      await request("PATCH", url, {
        data: { score: 0, feedback: "Cần làm lại.", published: false },
        cookie: teacher.cookie,
      });
      const own = "/assignments/" + assignment._id + "/my-submission";
      const pending = (await request("GET", own, { cookie: student.cookie }))
        .data;
      assert.equal(pending.score, null);
      assert.equal(pending.feedback, undefined);
      await request("PATCH", url, {
        data: { score: 0, feedback: "Cần làm lại.", published: true },
        cookie: teacher.cookie,
      });
      const published = (await request("GET", own, { cookie: student.cookie }))
        .data;
      assert.equal(published.score, 0);
      assert.equal(published.feedback, "Cần làm lại.");
      assert.equal(
        (await request("GET", own, { cookie: otherStudent.cookie })).data._id,
        fileSubmission._id,
      );
      assert.equal(
        (await request("GET", "/dashboard/student", { cookie: student.cookie }))
          .data.graded,
        1,
      );
      assert.equal(
        (await request("GET", "/dashboard/teacher", { cookie: teacher.cookie }))
          .data.ungraded,
        2,
      );
    },
  );
  await t.test(
    "TC07 · Quản trị, kiểm duyệt lớp, khóa/mở và thu hồi phiên",
    async () => {
      const accounts = await request(
        "GET",
        "/admin/users?role=student&isActive=true&limit=1",
        { cookie: admin.cookie },
      );
      assert.equal(accounts.data.items.length, 1);
      assert.equal(accounts.data.total, 2);
      await request("GET", "/admin/users/" + student.data._id, {
        cookie: admin.cookie,
      });
      await request("POST", "/admin/teachers", {
        data: credentials("new-teacher"),
        cookie: admin.cookie,
        expected: 201,
      });
      await request("PATCH", "/admin/users/" + admin.data._id + "/status", {
        data: { isActive: false },
        cookie: admin.cookie,
        expected: 409,
      });
      const accountUrl = "/admin/users/" + student.data._id + "/status";
      await request("PATCH", accountUrl, {
        data: { isActive: false },
        cookie: admin.cookie,
      });
      await request("GET", "/auth/me", {
        cookie: student.cookie,
        expected: 403,
      });
      await login("student", 403);
      assert.equal(
        (await request("GET", "/dashboard/admin", { cookie: admin.cookie }))
          .data.locked,
        1,
      );
      await request("PATCH", accountUrl, {
        data: { isActive: true },
        cookie: admin.cookie,
      });
      const again = await login("student");
      await request("GET", "/auth/me", { cookie: again.cookie });
      const courses = await request(
        "GET",
        "/admin/courses?status=open&teacherId=" + teacher.data._id,
        { cookie: admin.cookie },
      );
      assert.equal(courses.data.total, 1);
      await request("PATCH", "/admin/courses/" + course._id + "/status", {
        data: { status: "archived" },
        cookie: admin.cookie,
      });
      await request("PATCH", "/courses/" + course._id, {
        data: { status: "open" },
        cookie: teacher.cookie,
        expected: 403,
      });
      await request("POST", "/courses/" + course._id + "/enroll", {
        cookie: again.cookie,
        expected: 409,
      });
      assert.equal((await request("GET", "/courses", {})).data.total, 0);
      await request("POST", "/auth/logout", { cookie: again.cookie });
      await request("GET", "/auth/me", { cookie: again.cookie, expected: 401 });
    },
  );
});
