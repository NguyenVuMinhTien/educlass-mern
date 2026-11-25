import { Router } from "express";
import rateLimit from "express-rate-limit";
import { allow, auth } from "../middleware/auth.js";
import { upload } from "../files.js";
import { requireThat, respond } from "../http.js";
import { courseAccess } from "../access.js";
import { Assignment, Material, Submission } from "../models/index.js";
import * as accounts from "../controllers/auth.js";
import * as courses from "../controllers/courses.js";
import * as learning from "../controllers/learning.js";
import * as work from "../controllers/assignments.js";
import * as admin from "../controllers/admin.js";
import * as dashboard from "../controllers/dashboard.js";
import { findById } from "../http.js";

const loggedIn = auth();
const optional = auth({ optional: true });
const teacher = allow("teacher");
const student = allow("student");
const administrator = allow("admin");
const ownsCourse = async (req, _res, next) => {
  await courseAccess(req, req.params.courseId, "manage");
  next();
};
const ownsChildCourse = (model) => async (req, _res, next) => {
  const item = await findById(model, req.params.id);
  await courseAccess(req, item.courseId, "manage");
  next();
};
const maySubmit = async (req, _res, next) => {
  const submission =
    req.method === "PATCH" ? await findById(Submission, req.params.id) : null;
  if (submission)
    requireThat(
      String(submission.studentId) === req.user.id,
      403,
      "Bạn không có quyền sửa bài nộp này.",
    );
  const assignment = await work.getAssignment(
    submission?.assignmentId || req.params.id,
  );
  await courseAccess(req, assignment.courseId);
  next();
};

export function createRouter() {
  const api = Router();
  const loginLimit = rateLimit({
    windowMs: 15 * 60_000,
    limit: 30,
    skipSuccessfulRequests: true,
    legacyHeaders: false,
    standardHeaders: "draft-8",
    message: {
      success: false,
      message: "Bạn đã thử quá nhiều lần. Hãy thử lại sau 15 phút.",
      errors: [],
    },
  });
  api.get("/health", (_req, res) => respond(res, { status: "ok" }));
  api.post("/auth/register", loginLimit, accounts.register);
  api.post("/auth/login", loginLimit, accounts.login);
  api.post("/auth/logout", accounts.logout);
  api.get("/auth/me", loggedIn, accounts.me);
  api.get("/users/me", loggedIn, accounts.me);
  api.patch("/users/me", loggedIn, accounts.updateMe);

  api.get("/courses", courses.catalog);
  api.get("/categories", courses.categories);
  api.get("/courses/:id", optional, courses.detail);
  api.post("/courses", loggedIn, teacher, courses.createCourse);
  api.patch("/courses/:id", loggedIn, teacher, courses.editCourse);
  api.delete("/courses/:id", loggedIn, teacher, courses.deleteCourse);
  api.get("/teacher/courses", loggedIn, teacher, courses.teacherCourses);
  api.post("/courses/:courseId/enroll", loggedIn, student, courses.enroll);
  api.get("/student/enrollments", loggedIn, student, courses.enrolledCourses);
  api.get("/courses/:courseId/students", loggedIn, teacher, courses.roster);

  api.get("/courses/:courseId/lessons", loggedIn, learning.listLessons);
  api.post("/courses/:courseId/lessons", loggedIn, teacher, learning.addLesson);
  api.patch("/lessons/:id", loggedIn, teacher, learning.editLesson);
  api.delete("/lessons/:id", loggedIn, teacher, learning.deleteLesson);
  api.post("/lessons/:id/complete", loggedIn, student, learning.completeLesson);
  api.get("/courses/:courseId/materials", loggedIn, learning.listMaterials);
  api.post(
    "/courses/:courseId/materials",
    loggedIn,
    teacher,
    ownsCourse,
    upload,
    learning.addMaterial,
  );
  api.patch(
    "/materials/:id",
    loggedIn,
    teacher,
    ownsChildCourse(Material),
    upload,
    learning.editMaterial,
  );
  api.delete("/materials/:id", loggedIn, teacher, learning.deleteMaterial);
  api.get("/materials/:id/download", loggedIn, learning.downloadMaterial);

  api.get("/courses/:courseId/assignments", loggedIn, work.listAssignments);
  api.post(
    "/courses/:courseId/assignments",
    loggedIn,
    teacher,
    ownsCourse,
    upload,
    work.addAssignment,
  );
  api.get("/assignments/:id", loggedIn, work.assignmentDetail);
  api.patch(
    "/assignments/:id",
    loggedIn,
    teacher,
    ownsChildCourse(Assignment),
    upload,
    work.editAssignment,
  );
  api.delete("/assignments/:id", loggedIn, teacher, work.deleteAssignment);
  api.get("/assignments/:id/download", loggedIn, work.downloadAssignment);
  api.post(
    "/assignments/:id/submissions",
    loggedIn,
    student,
    maySubmit,
    upload,
    work.addSubmission,
  );
  api.get(
    "/assignments/:id/submissions",
    loggedIn,
    teacher,
    work.listSubmissions,
  );
  api.get(
    "/assignments/:id/my-submission",
    loggedIn,
    student,
    work.ownSubmission,
  );
  api.patch(
    "/submissions/:id",
    loggedIn,
    student,
    maySubmit,
    upload,
    work.editSubmission,
  );
  api.get("/submissions/:id/download", loggedIn, work.downloadSubmission);
  api.patch("/submissions/:id/grade", loggedIn, teacher, work.gradeSubmission);

  api.get(
    "/dashboard/admin",
    loggedIn,
    administrator,
    dashboard.adminDashboard,
  );
  api.get("/dashboard/teacher", loggedIn, teacher, dashboard.teacherDashboard);
  api.get("/dashboard/student", loggedIn, student, dashboard.studentDashboard);
  api.get("/admin/users", loggedIn, administrator, admin.listUsers);
  api.get("/admin/users/:id", loggedIn, administrator, admin.userDetails);
  api.patch(
    "/admin/users/:id/status",
    loggedIn,
    administrator,
    admin.toggleUser,
  );
  api.get("/admin/teachers", loggedIn, administrator, admin.teacherOptions);
  api.post("/admin/teachers", loggedIn, administrator, admin.addTeacher);
  api.get("/admin/courses", loggedIn, administrator, courses.adminCourses);
  api.patch(
    "/admin/courses/:id/status",
    loggedIn,
    administrator,
    courses.moderateCourse,
  );
  return api;
}
