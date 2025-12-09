// src/app.ts
import cors from "cors";
import express, { Application, Request, Response } from "express";
import mongoose from "mongoose";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import mainRouter from "./app/routes";
import httpStatus from "http-status";
import path from "path";
import { cleanupTempFiles } from "./config/multer.config";

const app: Application = express();

// Middlewares
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://outfitro.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));

// Health check endpoint for deployment platforms
app.get("/health", (req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: "Server is healthy",
  });
});

// Test Route
app.get("/", (req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: "Welcome to Outfitro API!",
  });
});

// DIAGNOSTIC ROUTE - REMOVE AFTER FIXING
import config from "./config";
app.get("/test-db", async (req: Request, res: Response) => {
  const statusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  const currentStatus = statusMap[mongoose.connection.readyState] || "unknown";

  let connectionError = null;
  try {
    // Try a simple operation
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
    }
  } catch (err) {
    connectionError = err;
  }

  res.status(200).json({
    status: "Diagnostic Report",
    timestamp: new Date().toISOString(),
    mongooseState: currentStatus,
    env: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      // Show first 15 chars of DB URL to verify protocol/user, hide password
      dbUrlPartial: config.database_url
        ? config.database_url.substring(0, 25) + "..."
        : "UNDEFINED",
    },
    connectionError: connectionError
      ? JSON.stringify(
          connectionError,
          Object.getOwnPropertyNames(connectionError)
        )
      : "None (if connected)",
  });
});

// DB Connection Check Middleware
app.use((req: Request, res: Response, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(httpStatus.SERVICE_UNAVAILABLE).json({
      success: false,
      message: "Database is connecting, please try again in a moment.",
    });
  }
  next();
});

// Main API Routes
app.use("/api/v1", mainRouter);

// Global Error Handler
app.use(globalErrorHandler);

// Periodic cleanup of temporary files every hour (run after startup)
setInterval(cleanupTempFiles, 60 * 60 * 1000);
// Run cleanup in background without blocking startup
setTimeout(cleanupTempFiles, 5000);

// Not Found Handler
app.use((req: Request, res: Response) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: "API Not Found!",
    errorMessages: [
      {
        path: req.originalUrl,
        message: "The requested route does not exist.",
      },
    ],
  });
});

export default app;
