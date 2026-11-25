import "dotenv/config";

const production = process.env.NODE_ENV === "production";
export const config = {
  production,
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/educlass",
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  clientOrigin: new URL(process.env.CLIENT_URL || "http://localhost:5173")
    .origin,
  uploadDir: process.env.UPLOAD_DIR || "uploads",
};
export function verifyConfig(settings) {
  if (
    !settings.jwtSecret ||
    settings.jwtSecret.length < 32 ||
    settings.jwtSecret.startsWith("replace_")
  ) {
    throw new Error(
      "JWT_SECRET phải là giá trị ngẫu nhiên có ít nhất 32 ký tự.",
    );
  }
}
