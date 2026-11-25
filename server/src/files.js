import multer from "multer";
import path from "node:path";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { requireThat } from "./http.js";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1,
    fields: 16,
    fieldSize: 32000,
    parts: 18,
  },
}).single("file");

const pdfMime = "application/pdf";
const allowed = { ".pdf": pdfMime, ".txt": "text/plain" };
const filePath = (settings, key) => {
  requireThat(
    /^[a-f\d-]{36}\.(pdf|txt)$/i.test(key),
    404,
    "Không tìm thấy tệp.",
  );
  return path.resolve(settings.uploadDir, key);
};
export function validateFile(input, pdfOnly) {
  const extension = path.extname(input.originalname).toLowerCase();
  const mime = allowed[extension];
  requireThat(
    mime && mime === input.mimetype && (!pdfOnly || extension === ".pdf"),
    400,
    pdfOnly
      ? "Hãy tải một tệp PDF hợp lệ."
      : "Chỉ chấp nhận tệp PDF hoặc TXT hợp lệ.",
  );
  requireThat(input.size > 0, 400, "Tệp đang trống.");
  if (extension === ".pdf") {
    requireThat(
      input.buffer.subarray(0, 5).toString() === "%PDF-" &&
        input.buffer.subarray(-1024).toString("latin1").includes("%%EOF"),
      400,
      "Nội dung tệp PDF không hợp lệ.",
    );
  } else {
    let content;
    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(input.buffer);
    } catch {
      content = null;
    }
    requireThat(
      content !== null && !content.includes("\0"),
      400,
      "Tệp TXT phải dùng mã hóa UTF-8.",
    );
  }
  return { extension, mime };
}
export async function storeFile(input, settings, pdfOnly = false) {
  const { extension, mime } = validateFile(input, pdfOnly);
  const key = randomUUID() + extension;
  await mkdir(settings.uploadDir, { recursive: true });
  await writeFile(filePath(settings, key), input.buffer, { flag: "wx" });
  return {
    key,
    mime,
    size: input.size,
    originalName: path
      .basename(input.originalname.replaceAll("\\", "/"))
      .split("")
      .filter((character) => {
        const code = character.charCodeAt(0);
        return code >= 32 && code !== 127;
      })
      .join("")
      .slice(-200),
  };
}
export async function removeFile(file, settings) {
  if (!file) return;
  try {
    await unlink(filePath(settings, file.key));
  } catch (error) {
    if (error.code !== "ENOENT")
      console.error("Upload cleanup:", error.code ?? error.name);
  }
}
export async function changeFile(
  req,
  document,
  update,
  { pdfOnly = false, clear = false } = {},
) {
  const settings = req.app.locals.settings;
  const oldFile = document.file;
  const newFile = req.file
    ? await storeFile(req.file, settings, pdfOnly)
    : null;
  if (newFile || clear) document.file = newFile ?? undefined;
  try {
    await update(document);
  } catch (error) {
    await removeFile(newFile, settings);
    throw error;
  }
  if (newFile || clear) await removeFile(oldFile, settings);
}
export function sendFile(req, res, next, file, inline = false) {
  requireThat(file, 404, "Tài nguyên không có tệp đính kèm.");
  const location = filePath(req.app.locals.settings, file.key);
  res.set("Cache-Control", "private, no-store");
  const options = { root: path.dirname(location) };
  const filename = path.basename(location);
  const done = (error) => {
    if (error) next(error);
  };
  if (inline && file.mime === pdfMime)
    return res.sendFile(filename, options, done);
  return res.download(filename, file.originalName, options, done);
}
export function visibleFile(document) {
  const data = document.toObject ? document.toObject() : { ...document };
  if (data.file) {
    const { originalName, mime, size } = data.file;
    data.file = { originalName, mime, size };
  }
  return data;
}
