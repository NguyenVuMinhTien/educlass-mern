import mongoose from "mongoose";

const { Schema, model } = mongoose;
const record = (fields) =>
  new Schema(fields, { timestamps: true, optimisticConcurrency: true });
const ref = (name, extra = {}) => ({
  type: Schema.Types.ObjectId,
  ref: name,
  required: true,
  ...extra,
});
const str = (maxlength, extra = {}) => ({
  type: String,
  trim: true,
  maxlength,
  ...extra,
});
export const roles = ["admin", "teacher", "student"];
export const courseStatuses = ["draft", "open", "closed", "archived"];
export const materialTypes = ["pdf", "video", "text"];

const file = new Schema(
  {
    key: str(48, { required: true }),
    originalName: str(200, { required: true }),
    mime: str(80, { required: true }),
    size: { type: Number, min: 1, required: true },
  },
  { _id: false },
);

const users = record({
  fullName: str(100, { required: true }),
  email: str(254, { required: true, lowercase: true, unique: true }),
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: roles, required: true, index: true },
  isActive: { type: Boolean, default: true },
});
const sessions = new Schema(
  {
    userId: ref("User", { index: true }),
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true },
);
const courses = record({
  moderated: { type: Boolean, default: false },
  deletedAt: Date,
  title: str(130, { required: true }),
  courseCode: str(24, { required: true, uppercase: true, unique: true }),
  description: str(5000, { required: true }),
  thumbnail: str(1000),
  category: str(80, { required: true, index: true }),
  teacherId: ref("User", { index: true }),
  status: { type: String, enum: courseStatuses, default: "draft", index: true },
});
const enrollments = record({
  courseId: ref("Course", { index: true }),
  studentId: ref("User"),
  enrolledAt: { type: Date, default: Date.now },
  completedLessonIds: [{ type: Schema.Types.ObjectId, ref: "Lesson" }],
});
enrollments.index({ studentId: 1, courseId: 1 }, { unique: true });
const lessons = record({
  deletedAt: Date,
  courseId: ref("Course", { index: true }),
  title: str(130, { required: true }),
  content: str(16000, { required: true }),
  order: { type: Number, min: 1, required: true },
});
const materials = record({
  courseId: ref("Course", { index: true }),
  lessonId: ref("Lesson", { required: false }),
  uploadedBy: ref("User"),
  title: str(130, { required: true }),
  type: { type: String, enum: materialTypes, required: true },
  content: str(16000),
  url: str(2000),
  file,
});
const assignments = record({
  deletedAt: Date,
  courseId: ref("Course", { index: true }),
  teacherId: ref("User"),
  title: str(130, { required: true }),
  description: str(8000, { required: true }),
  dueDate: { type: Date, required: true },
  maxScore: { type: Number, required: true, min: 1, max: 1000 },
  allowLateSubmission: { type: Boolean, default: false },
  file,
});
const submissions = record({
  assignmentId: ref("Assignment"),
  studentId: ref("User", { index: true }),
  textContent: str(16000),
  file,
  submittedAt: { type: Date, required: true },
  isLate: { type: Boolean, default: false },
  score: { type: Number, default: null, min: 0 },
  feedback: str(4000),
  gradedBy: ref("User", { required: false }),
  gradedAt: Date,
  published: { type: Boolean, default: false },
});
submissions.index({ assignmentId: 1, studentId: 1 }, { unique: true });
export const User = model("User", users);
export const Session = model("Session", sessions);
export const Course = model("Course", courses);
export const Enrollment = model("Enrollment", enrollments);
export const Lesson = model("Lesson", lessons);
export const Material = model("Material", materials);
export const Assignment = model("Assignment", assignments);
export const Submission = model("Submission", submissions);
