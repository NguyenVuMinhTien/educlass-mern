import jwt from "jsonwebtoken";
import { Session, User } from "../models/index.js";
import { HttpError, requireThat } from "../http.js";

export const cookieName = "educlass_session";
export const cookieOptions = (settings) => ({
  httpOnly: true,
  sameSite: "lax",
  secure: settings.production,
  path: "/",
});
const issuer = "educlass";
export function tokenClaims(token, settings) {
  try {
    return jwt.verify(token, settings.jwtSecret, {
      issuer,
      algorithms: ["HS256"],
    });
  } catch {
    throw new HttpError(401, "Phiên đăng nhập đã hết hạn hoặc không hợp lệ.");
  }
}
export async function createSession(user, req, res) {
  const settings = req.app.locals.settings;
  const oldToken = req.cookies[cookieName];
  if (oldToken) {
    let oldClaims;
    try {
      oldClaims = tokenClaims(oldToken, settings);
    } catch {
      /* An expired cookie can be replaced. */
    }
    if (oldClaims)
      await Session.deleteOne({ _id: oldClaims.jti, userId: oldClaims.sub });
  }
  const session = new Session({ userId: user.id });
  const token = jwt.sign({}, settings.jwtSecret, {
    subject: user.id,
    jwtid: session.id,
    issuer,
    expiresIn: settings.jwtExpiresIn,
    algorithm: "HS256",
  });
  session.expiresAt = new Date(jwt.decode(token).exp * 1000);
  await session.save();
  res.cookie(cookieName, token, {
    ...cookieOptions(settings),
    expires: session.expiresAt,
  });
}
export function auth({ optional = false } = {}) {
  return async (req, _res, next) => {
    const token = req.cookies[cookieName];
    if (!token && optional) return next();
    if (!token) throw new HttpError(401, "Bạn cần đăng nhập.");
    let claims;
    try {
      claims = tokenClaims(token, req.app.locals.settings);
    } catch (error) {
      if (optional) return next();
      throw error;
    }
    const [session, user] = await Promise.all([
      Session.exists({
        _id: claims.jti,
        userId: claims.sub,
        expiresAt: { $gt: new Date() },
      }),
      User.findById(claims.sub),
    ]);
    if (optional && (!session || !user?.isActive)) return next();
    requireThat(session && user, 401, "Phiên đăng nhập đã kết thúc.");
    requireThat(user.isActive, 403, "Tài khoản đang bị khóa.");
    req.user = user;
    req.sessionId = session._id;
    return next();
  };
}
export const allow =
  (...roles) =>
  (req, _res, next) => {
    requireThat(
      roles.includes(req.user?.role),
      403,
      "Bạn không có quyền thực hiện thao tác này.",
    );
    next();
  };
