import mongoose from "mongoose";
import { config, verifyConfig } from "./config.js";
import { buildApp } from "./app.js";
import * as models from "./models/index.js";

async function start() {
  verifyConfig(config);
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  await Promise.all(
    Object.values(models)
      .filter((item) => typeof item.init === "function")
      .map((item) => item.init()),
  );
  const server = buildApp().listen(
    config.port,
    config.production ? undefined : "127.0.0.1",
    () => {
      console.log(`EduClass API · port ${config.port}`);
    },
  );
  async function stop() {
    server.close();
    await mongoose.disconnect();
  }
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}
start().catch(async (error) => {
  console.error("Không thể khởi động máy chủ:", error.name, error.code ?? "");
  if (error.message.startsWith("JWT_SECRET")) console.error(error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
