/*
  index.ts — Entry point for the API Drift Observatory backend.

  This file creates the Express app, attaches global middleware (like JSON parsing),
  mounts route handlers, and starts the HTTP server on a configured port.

  Everything in the backend flows through here first.
*/

import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import endpointRoutes from "./routes/endpoints";
import { initPoller } from "./services/poller";
import alerts from "./routes/alerts";

const app = express();
const PORT = process.env.PORT || 3000;

// Allow requests from the frontend dev server
app.use(cors({ origin: 'http://localhost:3001' }))

// Middleware: parse incoming JSON request bodies
// Without this, req.body would always be undefined
app.use(express.json());

// Health check route — useful to confirm the server is running
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Mount auth routes — handles /auth/register and /auth/login
app.use("/auth", authRoutes);
app.use("/endpoints", endpointRoutes);
app.use("/alerts", alerts);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("DATABASE_URL loaded:", !!process.env.DATABASE_URL);
  initPoller().catch((err) =>
    console.error("[POLLER] Failed to initialise:", err),
  );
});
