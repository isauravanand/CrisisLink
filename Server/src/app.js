import express from "express";
import cors from "cors";
import path from "path";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes.js";
import emergencyRoutes from "./routes/emergency.routes.js";
import missingPersonRoutes from "./routes/missingPerson.routes.js";
import droneVideoRoutes from "./routes/droneVideo.routes.js";
import matchingRoutes from "./routes/matching.routes.js";
import operationsRoutes from "./routes/operations.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.middleware.js";

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve Uploaded Static Files (Missing Person Photographs, Drone Videos, Person Crops, Detection Frames)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Root Health & Information Endpoint
app.get("/", (req, res) => {
    res.json({
        success: true,
        name: "LifeLine AI Emergency & Crisis Management API",
        status: "ONLINE",
        timestamp: new Date().toISOString(),
        version: "1.0.0"
    });
});

// Dedicated Health Check Endpoint (Phase 10)
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        status: "healthy",
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        timestamp: new Date().toISOString()
    });
});

// API Routes Registration
app.use("/api/auth", authRoutes);
app.use("/api/emergencies", emergencyRoutes);
app.use("/api/missing-persons", missingPersonRoutes);
app.use("/api/drone-videos", droneVideoRoutes);
app.use("/api", matchingRoutes);
app.use("/api", operationsRoutes);

// 404 & Centralized Error Middleware Registration
app.use(notFoundHandler);
app.use(errorHandler);

export default app;