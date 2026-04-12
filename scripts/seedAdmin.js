import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { AdminUser } from "../models/AdminUser.js";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/msd_competency";
const raw =
  process.env.BOOTSTRAP_ADMIN_USERNAME ?? process.env.BOOTSTRAP_ADMIN_EMAIL;
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

if (!raw || !password) {
  console.error(
    "Set BOOTSTRAP_ADMIN_USERNAME (or legacy BOOTSTRAP_ADMIN_EMAIL) and BOOTSTRAP_ADMIN_PASSWORD in .env"
  );
  process.exit(1);
}

const username = String(raw).toLowerCase().trim();

await mongoose.connect(uri);
const passwordHash = await bcrypt.hash(password, 10);
await AdminUser.findOneAndUpdate(
  { username },
  { $set: { passwordHash, username } },
  { upsert: true, new: true }
);
console.log("Admin upserted:", username);
await mongoose.disconnect();
