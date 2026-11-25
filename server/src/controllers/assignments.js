import { z } from "zod";
import { Assignment, Submission } from "../models/index.js";
import { canSubmit, courseAccess } from "../access.js";
import { changeFile, sendFile, visibleFile } from "../files.js";
import {
  booleanField,
  findById,
  numberField,
  paginate,
  parse,
  requireThat,
  respond,
  sameId,
  textField,
} from "../http.js";

const assignmentFields = z.object({
  title: textField(130),
  description: textField(8000),
  dueDate: z.iso
    .datetime({ offset: true })
    .transform((value) => new Date(value)),
  maxScore: numberField(1, 1000),
  allowLateSubmission: booleanField.optional(),
  removeFile: booleanField.optional(),
});
export function submissionView(submission, teacher = false) {
  if (!submission) return null;
  const data = visibleFile(submission);
  if (!teacher && !data.published) {
    data.score = null;
    delete data.feedback;
    delete data.gradedBy;
    delete data.gradedAt;
  }
  return data;
}
export async function getAssignment(id) {
  const assignment = await findById(Assignment, id);
  requireThat(!assignment.deletedAt, 404, "Không tìm thấy bài tập.");
  return assignment;
}
export async function listAssignments(req, res) {
  const { course, enrollment } = await courseAccess(req, req.params.courseId);
  const assignments = await Assignment.find({
    courseId: course.id,
    deletedAt: null,
  })
    .sort({ dueDate: 1 })
    .lean();
  const ids = assignments.map((row) => row._id);
  if (enrollment) {
    const items = await Submission.find({
      assignmentId: { $in: ids },
      studentId: req.user.id,
    }).lean();
    const byId = new Map(
      items.map((item) => [String(item.assignmentId), item]),
    );
    return respond(
      res,
      assignments.map((row) => ({
        ...visibleFile(row),
        submission: submissionView(byId.get(String(row._id))),
      })),
    );
  }
  const counts = await Submission.aggregate([
    { $match: { assignmentId: { $in: ids } } },
    { $group: { _id: "$assignmentId", count: { $sum: 1 } } },
  ]);
  const countsById = new Map(counts.map((row) => [String(row._id), row.count]));
  respond(
    res,
    assignments.map((row) => ({
      ...visibleFile(row),
      submissionsCount: countsById.get(String(row._id)) || 0,
    })),
  );
}
export async function assignmentDetail(req, res) {
  const assignment = await getAssignment(req.params.id);
  const { enrollment, course } = await courseAccess(req, assignment.courseId);
  const submission = enrollment
    ? await Submission.findOne({
        assignmentId: assignment.id,
        studentId: req.user.id,
      })
    : null;
  respond(res, {
    ...visibleFile(assignment),
    courseTitle: course.title,
    courseStatus: course.status,
    submission: submissionView(submission),
  });
}
export async function addAssignment(req, res) {
  const { course } = await courseAccess(req, req.params.courseId, "manage");
  const fields = parse(assignmentFields.omit({ removeFile: true }), req.body);
  requireThat(fields.dueDate > new Date(), 400, "Hạn nộp phải ở tương lai.");
  const item = new Assignment({
    ...fields,
    courseId: course.id,
    teacherId: req.user.id,
  });
  await changeFile(req, item, (doc) => doc.save(), { pdfOnly: true });
  respond(res, visibleFile(item), "Đã tạo bài tập.", 201);
}
export async function editAssignment(req, res) {
  const item = await getAssignment(req.params.id);
  await courseAccess(req, item.courseId, "manage");
  const { removeFile, ...fields } = parse(assignmentFields.partial(), req.body);
  // Once created, the rubric stays valid for both current and concurrent submissions.
  requireThat(
    fields.maxScore === undefined || item.maxScore === fields.maxScore,
    409,
    "Điểm tối đa được cố định khi tạo bài tập.",
  );
  item.set(fields);
  await changeFile(req, item, (doc) => doc.save(), {
    pdfOnly: true,
    clear: removeFile,
  });
  respond(res, visibleFile(item), "Đã cập nhật bài tập.");
}
export async function deleteAssignment(req, res) {
  const item = await getAssignment(req.params.id);
  await courseAccess(req, item.courseId, "manage");
  requireThat(
    !(await Submission.exists({ assignmentId: item.id })),
    409,
    "Giữ lại bài tập đã có bài nộp.",
  );
  item.deletedAt = new Date();
  await item.save();
  respond(res, null, "Đã xóa bài tập.");
}
export async function downloadAssignment(req, res, next) {
  const assignment = await getAssignment(req.params.id);
  await courseAccess(req, assignment.courseId);
  return sendFile(req, res, next, assignment.file);
}
const submissionFields = z.object({
  textContent: textField(16000, 0).optional(),
  removeFile: booleanField.optional(),
});
async function saveSubmission(req, submission, assignment) {
  const { course, enrollment } = await courseAccess(req, assignment.courseId);
  requireThat(
    enrollment && sameId(submission.studentId, req.user.id),
    403,
    "Bạn không có quyền với bài nộp này.",
  );
  canSubmit(course);
  const submittedAt = new Date();
  const isLate = submittedAt > assignment.dueDate;
  if (!submission.isNew) {
    requireThat(
      submission.score === null && !isLate,
      409,
      "Chỉ được nộp lại trước hạn khi bài chưa được chấm.",
    );
  } else {
    requireThat(
      !isLate || assignment.allowLateSubmission,
      409,
      "Bài tập đã hết hạn nộp.",
    );
  }
  const { textContent, removeFile } = parse(submissionFields, req.body);
  submission.textContent = textContent ?? submission.textContent;
  requireThat(
    submission.textContent || req.file || (!removeFile && submission.file),
    400,
    "Hãy nhập bài làm hoặc chọn tệp.",
  );
  submission.set({ submittedAt, isLate });
  await changeFile(req, submission, (doc) => doc.save(), { clear: removeFile });
}
export async function addSubmission(req, res) {
  const assignment = await getAssignment(req.params.id);
  const submission = new Submission({
    assignmentId: assignment.id,
    studentId: req.user.id,
  });
  await saveSubmission(req, submission, assignment);
  respond(res, submissionView(submission), "Đã nộp bài.", 201);
}
export async function editSubmission(req, res) {
  const submission = await findById(Submission, req.params.id);
  const assignment = await getAssignment(submission.assignmentId);
  await saveSubmission(req, submission, assignment);
  respond(res, submissionView(submission), "Đã cập nhật bài nộp.");
}
export async function ownSubmission(req, res) {
  const assignment = await getAssignment(req.params.id);
  await courseAccess(req, assignment.courseId);
  const submission = await Submission.findOne({
    assignmentId: assignment.id,
    studentId: req.user.id,
  });
  respond(res, submissionView(submission));
}
export async function listSubmissions(req, res) {
  const assignment = await getAssignment(req.params.id);
  await courseAccess(req, assignment.courseId, "manage");
  const result = await paginate(
    Submission,
    { assignmentId: assignment.id },
    req.query,
    null,
    { path: "studentId", select: "fullName email" },
  );
  respond(res, {
    ...result,
    items: result.items.map((row) => submissionView(row, true)),
  });
}
export async function downloadSubmission(req, res, next) {
  const submission = await findById(Submission, req.params.id);
  const assignment = await getAssignment(submission.assignmentId);
  const { enrollment } = await courseAccess(req, assignment.courseId);
  if (enrollment)
    requireThat(
      sameId(req.user.id, submission.studentId),
      403,
      "Bạn không có quyền tải bài nộp này.",
    );
  return sendFile(req, res, next, submission.file);
}
export async function gradeSubmission(req, res) {
  const submission = await findById(Submission, req.params.id);
  const assignment = await getAssignment(submission.assignmentId);
  await courseAccess(req, assignment.courseId, "manage");
  const fields = parse(
    z.object({
      score: numberField(0, assignment.maxScore),
      feedback: textField(4000, 0).optional(),
      published: booleanField,
    }),
    req.body,
  );
  submission.set({ ...fields, gradedAt: new Date(), gradedBy: req.user.id });
  await submission.save();
  respond(
    res,
    submissionView(submission, true),
    fields.published ? "Đã công bố điểm." : "Đã lưu điểm nháp.",
  );
}
