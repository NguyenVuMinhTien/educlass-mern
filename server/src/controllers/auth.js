import bcrypt from "bcryptjs";
import { z } from "zod";
import { Session, User } from "../models/index.js";
import { parse, requireThat, respond, textField } from "../http.js";
import {
  cookieName,
  cookieOptions,
  createSession,
  tokenClaims,
} from "../middleware/auth.js";

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Email chưa đúng định dạng.")
  .max(254);
export const password = z
  .string()
  .min(8, "Mật khẩu cần tối thiểu 8 ký tự.")
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Mật khẩu vượt quá 72 byte.",
  );
export const account = z.object({
  fullName: textField(100, 2),
  email,
  password,
});
const registration = account
  .extend({ confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận chưa khớp.",
  });
export const userView = ({
  _id,
  fullName,
  email: address,
  role,
  isActive,
  createdAt,
}) => ({
  _id,
  fullName,
  email: address,
  role,
  isActive,
  createdAt,
});
export async function createAccount({ password: secret, ...fields }, role) {
  return User.create({
    ...fields,
    role,
    passwordHash: await bcrypt.hash(secret, 12),
  });
}
export async function register(req, res) {
  const fields = account.parse(parse(registration, req.body));
  const user = await createAccount(fields, "student");
  await createSession(user, req, res);
  respond(res, userView(user), "Tạo tài khoản thành công.", 201);
}
export async function login(req, res) {
  const credentials = parse(
    z.object({
      email,
      password: z
        .string()
        .min(1)
        .refine(
          (value) => Buffer.byteLength(value, "utf8") <= 72,
          "Mật khẩu vượt quá 72 byte.",
        ),
    }),
    req.body,
  );
  const user = await User.findOne({ email: credentials.email }).select(
    "+passwordHash",
  );
  const valid = await bcrypt.compare(
    credentials.password,
    user?.passwordHash ??
      "$2b$12$YR77JW1F88rVtz5aEZ5Mqev0PHMtC5HWDx3HcYQUPfSa4BSfpW/K2",
  );
  requireThat(user && valid, 401, "Email hoặc mật khẩu chưa đúng.");
  requireThat(user.isActive, 403, "Tài khoản đang bị khóa.");
  await createSession(user, req, res);
  respond(res, userView(user), "Đăng nhập thành công.");
}
export async function logout(req, res) {
  const settings = req.app.locals.settings;
  const token = req.cookies[cookieName];
  let claims;
  if (token) {
    try {
      claims = tokenClaims(token, settings);
    } catch {
      /* The expired cookie is cleared below. */
    }
  }
  if (claims) await Session.deleteOne({ _id: claims.jti, userId: claims.sub });
  res.clearCookie(cookieName, cookieOptions(settings));
  respond(res, null, "Bạn đã đăng xuất.");
}
export const me = (req, res) => respond(res, userView(req.user));
export async function updateMe(req, res) {
  const { fullName } = parse(
    z.object({ fullName: textField(100, 2) }),
    req.body,
  );
  req.user.fullName = fullName;
  await req.user.save();
  respond(res, userView(req.user), "Đã cập nhật thông tin.");
}
