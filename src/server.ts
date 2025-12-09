// src/server.ts
import mongoose from "mongoose";
import app from "./app";
import config from "./config";
import { Server } from "http";
import fs from "fs";
import path from "path";
import util from "util";

// --- LOGGING SETUP ---
const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logFile = fs.createWriteStream(path.join(logDir, "app.log"), {
  flags: "a",
});
const logStdout = process.stdout;
const logStderr = process.stderr;

console.log = function (...args) {
  const timestamp = new Date().toISOString();
  const msg = util.format(...args);
  logFile.write(`[${timestamp}] [INFO] ${msg}\n`);
  logStdout.write(`[${timestamp}] [INFO] ${msg}\n`);
};

console.error = function (...args) {
  const timestamp = new Date().toISOString();
  const msg = util.format(...args);
  logFile.write(`[${timestamp}] [ERROR] ${msg}\n`);
  logStderr.write(`[${timestamp}] [ERROR] ${msg}\n`);
};
// ---------------------

let server: Server;

async function bootstrap() {
  // Start server immediately to satisfy deployment health checks

  const PORT = process.env.PORT || config.port || 5000;
  server = app.listen(PORT, () => {
    console.log(`🚀 Application listening on port ${PORT}`);
  });

  try {
    console.log("⏳ Connecting to database...");
    // Increase global buffer timeout to match connection timeout
    mongoose.set("bufferTimeoutMS", 30000);

    await mongoose.connect(config.database_url as string, {
      serverSelectionTimeoutMS: 30000, // Allow more time for initial connection
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4 to avoid potential IPv6 resolution delays
    });
    console.log(`🛢️  Database connected successfully`);
  } catch (err) {
    console.error("❌ Failed to connect to database", err);
    // If DB fails, close server and exit
    if (server) {
      server.close(() => process.exit(1));
    } else {
      process.exit(1);
    }
  }

  process.on("unhandledRejection", (reason, promise) => {
    console.log("Unhandled Rejection at:", promise, "reason:", reason);
    if (server) {
      server.close(() => {
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
}

bootstrap();

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  if (server) {
    server.close();
  }
});
