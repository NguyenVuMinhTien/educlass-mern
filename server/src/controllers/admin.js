import { z } from "zod";
import { User, roles } from "../models/index.js";
import { account, createAccount, userView } from "./auth.js";
import {
  booleanField,
  findById,
  paginate,
  parse,
  requireThat,
  respond,
  searchPattern,
  sameId,
} from "../http.js";

export async function listUsers(req, res) {
  const filter = {};
  if (req.query.role) filter.role = parse(z.enum(roles), req.query.role);
  if (req.query.isActive)
    filter.isActive = parse(booleanField, req.query.isActive);
  if (typeof req.query.search === "string" && req.query.search.trim()) {
    const pattern = searchPattern(req.query.search.trim());
    filter.$or = [{ fullName: pattern }, { email: pattern }];
  }
  respond(
    res,
    await paginate(
      User,
      filter,
      req.query,
      "fullName email role isActive createdAt",
    ),
  );
}
export async function userDetails(req, res) {
  respond(res, userView(await findById(User, req.params.id)));
}
export async function toggleUser(req, res) {
  const user = await findById(User, req.params.id);
  const { isActive } = parse(z.object({ isActive: booleanField }), req.body);
  // Admin accounts are provisioned and recovered via a separate operator process.
  requireThat(
    isActive || (!sameId(user.id, req.user.id) && user.role !== "admin"),
    409,
    "Tài khoản quản trị không thể khóa qua giao diện.",
  );
  user.isActive = isActive;
  await user.save();
  respond(
    res,
    userView(user),
    isActive ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.",
  );
}
export async function addTeacher(req, res) {
  const user = await createAccount(parse(account, req.body), "teacher");
  respond(res, userView(user), "Đã tạo tài khoản giảng viên.", 201);
}
export async function teacherOptions(_req, res) {
  const rows = await User.find({ role: "teacher" })
    .select("fullName")
    .sort("fullName")
    .lean();
  respond(res, rows);
}
