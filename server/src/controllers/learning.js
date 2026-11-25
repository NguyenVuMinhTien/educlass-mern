import { z } from "zod";
import {
  Enrollment,
  Lesson,
  Material,
  materialTypes,
} from "../models/index.js";
import { courseAccess } from "../access.js";
import { changeFile, removeFile, sendFile, visibleFile } from "../files.js";
import {
  findById,
  numberField,
  objectId,
  parse,
  requireThat,
  respond,
  sameId,
  textField,
  urlField,
} from "../http.js";

const lessonFields = z.object({
  title: textField(130),
  content: textField(16000),
  order: numberField(1, 9999).pipe(z.int()),
});
const materialFields = z.object({
  title: textField(130),
  type: z.enum(materialTypes),
  content: textField(16000).optional(),
  url: urlField().optional(),
  lessonId: z.string().optional(),
});
export async function listLessons(req, res) {
  const { course, enrollment } = await courseAccess(req, req.params.courseId);
  const lessons = await Lesson.find({ courseId: course.id, deletedAt: null })
    .sort({ order: 1, createdAt: 1 })
    .lean();
  respond(res, {
    lessons,
    completedLessonIds: enrollment?.completedLessonIds || [],
  });
}
export async function addLesson(req, res) {
  const { course } = await courseAccess(req, req.params.courseId, "manage");
  const lesson = await Lesson.create({
    ...parse(lessonFields, req.body),
    courseId: course.id,
  });
  respond(res, lesson, "Đã thêm bài học.", 201);
}
async function getLesson(id) {
  const lesson = await findById(Lesson, id);
  requireThat(!lesson.deletedAt, 404, "Không tìm thấy bài học.");
  return lesson;
}
export async function editLesson(req, res) {
  const lesson = await getLesson(req.params.id);
  await courseAccess(req, lesson.courseId, "manage");
  lesson.set(parse(lessonFields.partial(), req.body));
  await lesson.save();
  respond(res, lesson, "Đã cập nhật bài học.");
}
export async function deleteLesson(req, res) {
  const lesson = await getLesson(req.params.id);
  await courseAccess(req, lesson.courseId, "manage");
  lesson.deletedAt = new Date();
  await lesson.save();
  respond(
    res,
    null,
    "Đã xóa bài học. Tài liệu đính kèm vẫn nằm trong kho tài liệu.",
  );
}
export async function completeLesson(req, res) {
  const lesson = await getLesson(req.params.id);
  const { enrollment } = await courseAccess(req, lesson.courseId);
  requireThat(enrollment, 403, "Bạn cần ghi danh trước.");
  await Enrollment.updateOne(
    { _id: enrollment.id },
    { $addToSet: { completedLessonIds: lesson.id } },
  );
  respond(res, { lessonId: lesson.id }, "Đã đánh dấu hoàn thành.");
}
export async function listMaterials(req, res) {
  const { course } = await courseAccess(req, req.params.courseId);
  const items = await Material.find({ courseId: course.id })
    .sort({ createdAt: -1 })
    .lean();
  respond(res, items.map(visibleFile));
}
async function saveMaterial(req, material, fields) {
  if (fields.lessonId) {
    const lesson = await getLesson(objectId(fields.lessonId));
    requireThat(
      sameId(lesson.courseId, material.courseId),
      400,
      "Bài học không thuộc khóa học này.",
    );
  }
  if (fields.lessonId !== undefined)
    material.lessonId = fields.lessonId || undefined;
  material.set({ title: fields.title, type: fields.type });
  const expectsPdf = material.type === "pdf";
  if (material.type === "text") {
    requireThat(fields.content, 400, "Hãy nhập nội dung bài đọc.");
    material.content = fields.content;
  } else material.content = undefined;
  if (material.type === "video") {
    requireThat(fields.url, 400, "Hãy nhập liên kết HTTPS cho video.");
    material.url = fields.url;
  } else material.url = undefined;
  requireThat(
    expectsPdf ? req.file || material.file : !req.file,
    400,
    expectsPdf ? "Hãy chọn tệp PDF." : "Chỉ tài liệu PDF nhận tệp tải lên.",
  );
  await changeFile(req, material, (doc) => doc.save(), {
    pdfOnly: true,
    clear: !expectsPdf,
  });
}
export async function addMaterial(req, res) {
  const { course } = await courseAccess(req, req.params.courseId, "manage");
  const material = new Material({
    courseId: course.id,
    uploadedBy: req.user.id,
  });
  await saveMaterial(req, material, parse(materialFields, req.body));
  respond(res, visibleFile(material), "Đã thêm tài liệu.", 201);
}
export async function editMaterial(req, res) {
  const material = await findById(Material, req.params.id);
  await courseAccess(req, material.courseId, "manage");
  await saveMaterial(req, material, parse(materialFields, req.body));
  respond(res, visibleFile(material), "Đã cập nhật tài liệu.");
}
export async function deleteMaterial(req, res) {
  const material = await findById(Material, req.params.id);
  await courseAccess(req, material.courseId, "manage");
  const result = await Material.deleteOne({
    _id: material.id,
    __v: material.__v,
  });
  requireThat(
    result.deletedCount,
    409,
    "Tài liệu vừa thay đổi. Hãy tải lại trang.",
  );
  await removeFile(material.file, req.app.locals.settings);
  respond(res, null, "Đã xóa tài liệu.");
}
export async function downloadMaterial(req, res, next) {
  const material = await findById(Material, req.params.id);
  await courseAccess(req, material.courseId);
  return sendFile(req, res, next, material.file, req.query.preview === "1");
}
