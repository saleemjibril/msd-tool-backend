import "dotenv/config";
import express from "express";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import surveyRoutes from "./routes/surveyRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { AdminUser } from "./models/AdminUser.js";
import { getFramework } from "./controllers/surveyController.js";

const app = express();
const PORT = process.env.PORT || 5055;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/msd_competency";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(compression());
app.use(morgan("dev"));
app.use(
  cors({
    origin: CLIENT_URL.split(",").map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/framework", getFramework);

app.use("/api/survey", surveyRoutes);
app.use("/api/admin", adminRoutes);

async function ensureBootstrapAdmin() {
  const raw =
    process.env.BOOTSTRAP_ADMIN_USERNAME ?? process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!raw || !password) return;
  const username = String(raw).toLowerCase().trim();
  const existing = await AdminUser.findOne({ username });
  if (existing) return;
  const passwordHash = await bcrypt.hash(password, 10);
  await AdminUser.create({ username, passwordHash });
  console.log(`Bootstrap admin created: ${username}`);
}

async function start() {
  await mongoose.connect(MONGODB_URI);
  console.log("MongoDB connected");
  await ensureBootstrapAdmin();
  app.listen(PORT, () => {
    console.log(`MSD Competency API http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
