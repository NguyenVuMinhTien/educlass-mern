import { z } from "zod";
import {
  Assignment,
  Course,
  Enrollment,
  Lesson,
  Submission,
  User,
  courseStatuses,
} from "../models/index.js";
import { courseAccess, teacherFields } from "../access.js";
import {
  findById,
  objectId,
  paginate,
  parse,
  requireThat,
  respond,
  searchPattern,
  textField,
  urlField,
} from "../http.js";

const statusField = z.enum(courseStatuses);
const courseFields = z.object({
  title: textField(130, 3),
  courseCode: textField(24, 3)
    .regex(/^[a-z0-9-]+$/i, "Mã khóa học chỉ gồm chữ, số và dấu gạch ngang.")
    .transform((code) => code.toUpperCase()),
  description: textField(5000, 8),
  category: textField(80),
  thumbnail: z.union([urlField(1000), z.literal("")]).optional(),
  status: statusField.optional(),
});
function courseFilter(query) {
  const filter = { deletedAt: null };
  if (typeof query.search === "string" && query.search.trim()) {
    const pattern = searchPattern(query.search.trim());
    filter.$or = [{ title: pattern }, { courseCode: pattern }];
  }
  if (typeof query.category === "string" && query.category)
    filter.category = query.category.slice(0, 80);
  return filter;
}
export async function catalog(req, res) {
  const result = await paginate(
    Course,
    { ...courseFilter(req.query), status: "open" },
    req.query,
    null,
    teacherFields,
  );
  respond(res, result);
}
export async function categories(_req, res) {
  respond(
    res,
    (
      await Course.distinct("category", { status: "open", deletedAt: null })
    ).sort((a, b) => a.localeCompare(b, "vi")),
  );
}
export async function detail(req, res) {
  const { course, enrollment } = await courseAccess(
    req,
    req.params.id,
    "overview",
  );
  const lessonCount = await Lesson.countDocuments({
    courseId: course.id,
    deletedAt: null,
  });
  await course.populate(teacherFields);
  respond(res, {
    ...course.toObject(),
    lessonCount,
    enrolled: Boolean(enrollment),
  });
}
export async function teacherCourses(req, res) {
  const result = await paginate(
    Course,
    { ...courseFilter(req.query), teacherId: req.user.id },
    req.query,
    null,
    teacherFields,
  );
  respond(res, result);
}
export async function adminCourses(req, res) {
  const filter = courseFilter(req.query);
  if (req.query.status) filter.status = parse(statusField, req.query.status);
  if (req.query.teacherId) filter.teacherId = objectId(req.query.teacherId);
  respond(res, await paginate(Course, filter, req.query, null, teacherFields));
}
export async function createCourse(req, res) {
  const fields = parse(courseFields, req.body);
  const course = await Course.create({ ...fields, teacherId: req.user.id });
  respond(res, course, "Đã tạo khóa học.", 201);
}
export async function editCourse(req, res) {
  const { course } = await courseAccess(req, req.params.id, "manage");
  requireThat(
    !course.moderated,
    403,
    "Khóa học đang được quản trị viên lưu trữ.",
  );
  course.set(parse(courseFields.partial(), req.body));
  await course.save();
  respond(res, course, "Đã cập nhật khóa học.");
}
export async function deleteCourse(req, res) {
  const { course } = await courseAccess(req, req.params.id, "manage");
  requireThat(
    course.status === "draft" &&
      !course.moderated &&
      !(await Enrollment.exists({ courseId: course.id })),
    409,
    "Chỉ xóa được bản nháp chưa có ghi danh. Hãy lưu trữ để giữ hồ sơ học tập.",
  );
  course.deletedAt = new Date();
  await course.save();
  respond(res, null, "Đã xóa bản nháp.");
}
export async function moderateCourse(req, res) {
  const course = await findById(Course, req.params.id);
  requireThat(!course.deletedAt, 404, "Không tìm thấy khóa học.");
  const { status } = parse(z.object({ status: statusField }), req.body);
  course.status = status;
  course.moderated = status === "archived";
  await course.save();
  respond(res, course, "Đã cập nhật trạng thái.");
}
export async function enroll(req, res) {
  const course = await findById(Course, req.params.courseId);
  requireThat(
    course.status === "open" && !course.deletedAt,
    409,
    "Khóa học hiện không mở ghi danh.",
  );
  const enrollment = await Enrollment.create({
    courseId: course.id,
    studentId: req.user.id,
  });
  respond(res, enrollment, "Ghi danh thành công.", 201);
}
export function progress(lessons, completed) {
  const completedIds = new Set(completed.map(String));
  const done = lessons.filter((lesson) =>
    completedIds.has(String(lesson._id)),
  ).length;
  return lessons.length ? Math.round((done / lessons.length) * 100) : 0;
}
export async function enrollmentViews(enrollments) {
  const courseIds = enrollments.map((row) => row.courseId?._id).filter(Boolean);
  const lessons = await Lesson.find({
    courseId: { $in: courseIds },
    deletedAt: null,
  })
    .select("courseId")
    .lean();
  const grouped = Map.groupBy(lessons, (lesson) => String(lesson.courseId));
  return enrollments
    .filter((row) => row.courseId && !row.courseId.deletedAt)
    .map((row) => ({
      ...row,
      progress: progress(
        grouped.get(String(row.courseId._id)) || [],
        row.completedLessonIds,
      ),
    }));
}
export async function enrolledCourses(req, res) {
  const result = await paginate(
    Enrollment,
    { studentId: req.user.id },
    req.query,
    null,
    {
      path: "courseId",
      populate: teacherFields,
    },
  );
  respond(res, { ...result, items: await enrollmentViews(result.items) });
}
export async function roster(req, res) {
  const { course } = await courseAccess(req, req.params.courseId, "manage");
  const filter = { courseId: course.id };
  if (typeof req.query.search === "string" && req.query.search.trim()) {
    const pattern = searchPattern(req.query.search.trim());
    const recipients = await User.find({
      role: "student",
      $or: [{ fullName: pattern }, { email: pattern }],
    }).distinct("_id");
    filter.studentId = { $in: recipients };
  }
  const result = await paginate(Enrollment, filter, req.query, null, {
    path: "studentId",
    select: "fullName email",
  });
  const [lessons, assignments] = await Promise.all([
    Lesson.find({ courseId: course.id, deletedAt: null }).select("_id").lean(),
    Assignment.find({ courseId: course.id, deletedAt: null })
      .select("title maxScore dueDate")
      .sort("dueDate")
      .lean(),
  ]);
  const rows = await Submission.find({
    assignmentId: { $in: assignments.map((row) => row._id) },
    studentId: {
      $in: result.items.map((row) => row.studentId?._id).filter(Boolean),
    },
  })
    .select("assignmentId studentId score published isLate")
    .lean();
  const groups = Map.groupBy(rows, (row) => String(row.studentId));
  respond(res, {
    ...result,
    items: result.items.map((row) => ({
      ...row,
      progress: progress(lessons, row.completedLessonIds),
      submissions: groups.get(String(row.studentId?._id)) || [],
    })),
    assignments,
  });
}
