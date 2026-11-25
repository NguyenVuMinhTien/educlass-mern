import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, verifyConfig } from "./config.js";
import { createRouter } from "./routes/index.js";
import { errorHandler, HttpError } from "./http.js";

export function buildApp(settings = config) {
  verifyConfig(settings);
  const app = express();
  app.locals.settings = settings;
  app.disable("x-powered-by");
  if (settings.production && process.env.TRUST_PROXY === "1")
    app.set("trust proxy", 1);
  app.use(
    helmet({
      strictTransportSecurity: settings.production,
      contentSecurityPolicy: {
        directives: {
          imgSrc: ["'self'", "data:", "https:"],
          upgradeInsecureRequests: settings.production ? [] : null,
        },
      },
    }),
  );
  app.use(cors({ origin: settings.clientOrigin, credentials: true }));

  app.use("/api/v1", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.get("origin") !== settings.clientOrigin
    ) {
      return next(new HttpError(403, "Nguồn yêu cầu không hợp lệ."));
    }
    return next();
  });
  app.use(
    "/api/v1",
    rateLimit({
      windowMs: 60_000,
      limit: 240,
      legacyHeaders: false,
      standardHeaders: "draft-8",
      message: {
        success: false,
        message: "Quá nhiều yêu cầu. Hãy thử lại trong giây lát.",
        errors: [],
      },
    }),
  );
  app.use(
    "/api/v1",
    express.json({ limit: "128kb" }),
    cookieParser(),
    createRouter(),
  );
  app.use("/api", (_req, _res, next) =>
    next(new HttpError(404, "Không tìm thấy đường dẫn API.")),
  );

  const web = fileURLToPath(new URL("../../client/dist/", import.meta.url));
  app.use(express.static(web));
  app.get("/{*path}", (req, res, next) => {
    if (!req.accepts("html") || path.extname(req.path)) return next();
    return res.sendFile(path.join(web, "index.html"), next);
  });
  app.use((_req, _res, next) =>
    next(new HttpError(404, "Không tìm thấy tài nguyên.")),
  );
  app.use(errorHandler);
  return app;
}
