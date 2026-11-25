import {
  Assignment,
  Course,
  Enrollment,
  Submission,
  User,
} from "../models/index.js";
import { enrollmentViews } from "./courses.js";
import { teacherFields } from "../access.js";
import { respond } from "../http.js";

export async function adminDashboard(_req, res) {
  const [
    users,
    teachers,
    students,
    courses,
    openCourses,
    locked,
    recentCourses,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "teacher" }),
    User.countDocuments({ role: "student" }),
    Course.countDocuments({ deletedAt: null }),
    Course.countDocuments({ deletedAt: null, status: "open" }),
    User.countDocuments({ isActive: false }),
    Course.find({ deletedAt: null })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate(teacherFields)
      .lean(),
  ]);
  respond(res, {
    users,
    teachers,
    students,
    courses,
    openCourses,
    locked,
    recentCourses,
  });
}
export async function teacherDashboard(req, res) {
  const teacherId = req.user.id;
  const filter = { teacherId, deletedAt: null };
  const [courseIds, openCourses, recentCourses] = await Promise.all([
    Course.distinct("_id", filter),
    Course.countDocuments({ ...filter, status: "open" }),
    Course.find(filter).sort({ updatedAt: -1 }).limit(5).lean(),
  ]);
  const [students, assignmentIds] = await Promise.all([
    Enrollment.distinct("studentId", { courseId: { $in: courseIds } }),
    Assignment.distinct("_id", {
      courseId: { $in: courseIds },
      deletedAt: null,
    }),
  ]);
  const pending = { assignmentId: { $in: assignmentIds }, score: null };
  const [ungraded, recentSubmissions] = await Promise.all([
    Submission.countDocuments(pending),
    Submission.find(pending)
      .sort({ submittedAt: -1 })
      .limit(6)
      .populate("studentId", "fullName")
      .populate("assignmentId", "title maxScore")
      .lean(),
  ]);
  respond(res, {
    courses: courseIds.length,
    openCourses,
    students: students.length,
    recentCourses,
    assignments: assignmentIds.length,
    ungraded,
    recentSubmissions,
  });
}
export async function studentDashboard(req, res) {
  const studentId = req.user.id;
  const enrollments = await Enrollment.find({ studentId })
    .sort({ enrolledAt: -1 })
    .populate({ path: "courseId", populate: teacherFields })
    .lean();
  const courses = await enrollmentViews(enrollments);
  const courseIds = courses.map((row) => row.courseId._id);
  const assignments = await Assignment.find({
    courseId: { $in: courseIds },
    deletedAt: null,
  })
    .select("courseId title dueDate maxScore allowLateSubmission")
    .sort({ dueDate: 1 })
    .lean();
  const submissions = await Submission.find({
    studentId,
    assignmentId: { $in: assignments.map((row) => row._id) },
  })
    .select("assignmentId submittedAt isLate published score")
    .lean();
  const byId = new Map(
    submissions.map((row) => [String(row.assignmentId), row]),
  );
  const byCourse = new Map(
    courses.map((row) => [String(row.courseId._id), row.courseId]),
  );
  const assignmentRows = assignments.map((row) => {
    const course = byCourse.get(String(row.courseId));
    const previous = byId.get(String(row._id));
    const submission = previous
      ? { ...previous, score: previous.published ? previous.score : null }
      : null;
    return {
      ...row,
      courseTitle: course.title,
      courseStatus: course.status,
      submission,
    };
  });
  const todo = assignmentRows.filter(
    (row) =>
      !row.submission &&
      row.courseStatus === "open" &&
      (row.dueDate > new Date() || row.allowLateSubmission),
  );
  respond(res, {
    enrolled: courses.length,
    active: courses.filter(
      (row) => row.courseId.status === "open" && row.progress < 100,
    ).length,
    todo: todo.length,
    submitted: submissions.length,
    graded: submissions.filter((row) => row.published).length,
    progress: courses.length
      ? Math.round(
          courses.reduce((sum, row) => sum + row.progress, 0) / courses.length,
        )
      : 0,
    courses: courses.slice(0, 5),
    upcoming: todo.filter((row) => row.dueDate > new Date()).slice(0, 6),
    assignments: assignmentRows,
  });
}
