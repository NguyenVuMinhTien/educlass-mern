import mongoose from "mongoose";
import { z } from "zod";

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
export function requireThat(condition, status, message) {
  if (!condition) throw new HttpError(status, message);
}
export function respond(
  res,
  data,
  message = "Thao tác thành công.",
  status = 200,
) {
  res.status(status).json({ success: true, message, data });
}
export function parse(schema, body) {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    throw new HttpError(
      400,
      "Thông tin chưa hợp lệ.",
      result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    );
  }
  return result.data;
}
export function objectId(value) {
  requireThat(
    mongoose.isObjectIdOrHexString(value),
    400,
    "Mã tài nguyên không hợp lệ.",
  );
  return value;
}
export async function findById(model, id) {
  const item = await model.findById(objectId(id));
  requireThat(item, 404, "Không tìm thấy tài nguyên.");
  return item;
}
export const sameId = (left, right) => String(left) === String(right);
export const textField = (max, min = 1) =>
  z
    .string()
    .trim()
    .min(min, "Hãy nhập nội dung.")
    .max(max, `Tối đa ${max} ký tự.`);
export const urlField = (max = 2000) =>
  textField(max).refine((value) => {
    try {
      const parsed = new URL(value);
      return (
        parsed.protocol === "https:" && !parsed.username && !parsed.password
      );
    } catch {
      return false;
    }
  }, "Hãy nhập liên kết HTTPS hợp lệ.");
export const booleanField = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((value) => value === true || value === "true");
export const numberField = (min, max) =>
  z
    .union([z.number(), z.string().trim().min(1)])
    .pipe(z.coerce.number().min(min).max(max));
export const searchPattern = (value) =>
  new RegExp(
    String(value)
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    "i",
  );
export function paging(query) {
  const page = Math.min(
    10000,
    Math.max(1, Math.floor(Number(query.page) || 1)),
  );
  const limit = Math.min(
    30,
    Math.max(1, Math.floor(Number(query.limit) || 12)),
  );
  return { page, limit, skip: (page - 1) * limit };
}
export async function paginate(
  model,
  filter,
  query,
  select = null,
  populate = null,
) {
  const { page, limit, skip } = paging(query);
  const rows = model
    .find(filter)
    .select(select)
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit);
  if (populate) rows.populate(populate);
  const [items, total] = await Promise.all([
    rows.lean(),
    model.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}
export function errorHandler(error, _req, res, next) {
  if (res.headersSent) return next(error);
  let { status, message, details } = error;
  if (error.code === 11000) {
    status = 409;
    message = "Thông tin này đã tồn tại.";
  } else if (
    error.name === "VersionError" ||
    error.name === "DocumentNotFoundError"
  ) {
    status = 409;
    message = "Dữ liệu vừa thay đổi. Hãy tải lại trang và thử lại.";
  } else if (error.name === "ValidationError" || error.name === "CastError") {
    status = 400;
    message = "Thông tin chưa hợp lệ.";
  } else if (error.code === "LIMIT_FILE_SIZE") {
    status = 413;
    message = "Tệp vượt quá giới hạn 8 MB.";
  } else if (error.name === "MulterError") {
    status = 400;
    message = "Biểu mẫu tải tệp không hợp lệ.";
  } else if (
    error.type === "entity.parse.failed" ||
    error.type === "entity.too.large"
  ) {
    message = "Nội dung yêu cầu không hợp lệ hoặc quá lớn.";
  } else if (!status || status >= 500) {
    console.error(error.name, error.code ?? "");
    status = 500;
    message = "Máy chủ chưa thể xử lý yêu cầu.";
  }
  if (!(error instanceof HttpError) && status === 404)
    message = "Không tìm thấy tài nguyên.";
  return res
    .status(status)
    .json({ success: false, message, errors: details ?? [] });
}
