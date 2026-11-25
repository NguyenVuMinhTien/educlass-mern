import { Course, Enrollment } from "./models/index.js";
import { findById, requireThat, sameId } from "./http.js";

export const teacherFields = { path: "teacherId", select: "fullName" };
export async function courseAccess(req, courseId, mode = "read") {
  const course = await findById(Course, courseId);
  requireThat(!course.deletedAt, 404, "Không tìm thấy khóa học.");
  if (req.user?.role === "teacher" && sameId(req.user.id, course.teacherId))
    return { course };
  if (req.user?.role === "admin" && mode === "overview") return { course };
  if (req.user?.role === "student" && mode !== "manage") {
    const enrollment = await Enrollment.findOne({
      courseId: course.id,
      studentId: req.user.id,
    });
    if (enrollment) return { course, enrollment };
  }
  if (mode === "overview") {
    requireThat(
      course.status === "open",
      404,
      "Khóa học hiện không được công bố.",
    );
    return { course };
  }
  requireThat(false, 403, "Bạn không có quyền truy cập nội dung khóa học.");
}
export function canSubmit(course) {
  requireThat(
    course.status === "open",
    409,
    "Khóa học hiện không nhận bài nộp.",
  );
}
