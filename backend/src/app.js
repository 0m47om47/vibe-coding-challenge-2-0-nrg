import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";
import { connectDB } from "./db.js";
import { HttpError } from "./utils/httpError.js";
import authRoutes from "./routes/auth.js";
import playerRoutes from "./routes/players.js";
import sessionRoutes from "./routes/sessions.js";
import matchRoutes from "./routes/matches.js";
import userRoutes from "./routes/users.js";
import academyRoutes from "./routes/academies.js";

const app = express();

if (process.env.NODE_ENV !== "production") {
  app.use(cors({ origin: "http://localhost:3000", credentials: true }));
}
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Same as /api/health, but also checks that MongoDB answers. 503 if it does not.
app.get("/api/health/db", async (_req, res) => {
  try {
    await connectDB();
    await mongoose.connection.db.admin().ping();
    res.json({ ok: true, db: "up" });
  } catch {
    res.status(503).json({ error: "The database is not reachable." });
  }
});

app.use("/api", async (_req, _res, next) => {
  await connectDB();
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/users", userRoutes);
app.use("/api", academyRoutes); // /api/academies (public) and /api/academy

app.use("/api", (_req, _res, next) => next(new HttpError(404, "Not found.")));

// Every error leaves as { error, details? } (AGENTS.md §4). Never a stack trace.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "The request body is not valid JSON." });
  }
  if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: "Some of the values sent are not valid." });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

export default app;
