import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { AdminUser } from "../models/AdminUser.js";
import { SurveySubmission } from "../models/SurveySubmission.js";
import { loadFramework } from "../utils/loadFramework.js";
import { computeSurveyResult } from "../utils/computeSurvey.js";
import { normalizePhone } from "../utils/phoneNormalize.js";

export async function login(req, res) {
  try {
    const raw =
      req.body?.username ??
      req.body?.email; /* backward compat for old clients */
    const username = String(raw || "").toLowerCase().trim();
    const password = String(req.body?.password || "");
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    const admin = await AdminUser.findOne({ username });
    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "Server misconfiguration" });
    }
    const token = jwt.sign({ sub: admin._id.toString(), role: "admin" }, secret, {
      expiresIn: "7d",
    });
    res.json({ token, username: admin.username });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed" });
  }
}

export async function listSurveys(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { status: "completed" };
    if (req.query.phone) {
      const n = normalizePhone(req.query.phone);
      if (n) filter.phoneNormalized = n;
    }
    if (req.query.name) {
      filter.respondentName = new RegExp(String(req.query.name).trim(), "i");
    }
    if (req.query.from || req.query.to) {
      filter.completedAt = {};
      if (req.query.from) filter.completedAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.completedAt.$lte = new Date(req.query.to);
    }

    const [items, total] = await Promise.all([
      SurveySubmission.find(filter)
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("respondentName phoneNormalized completedAt frameworkVersion createdAt")
        .lean(),
      SurveySubmission.countDocuments(filter),
    ]);

    const summaries = items.map((row) => ({
      id: row._id.toString(),
      respondentName: row.respondentName,
      phoneNormalized: row.phoneNormalized,
      completedAt: row.completedAt,
      frameworkVersion: row.frameworkVersion,
    }));

    res.json({ page, limit, total, items: summaries });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "List failed" });
  }
}

export async function getSurvey(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: "Not found" });
    }
    const survey = await SurveySubmission.findById(req.params.id).lean();
    if (!survey || survey.status !== "completed") {
      return res.status(404).json({ error: "Not found" });
    }
    const framework = loadFramework();
    const result = computeSurveyResult(framework, survey.answers || {}, survey.foundation || {});
    res.json({
      id: survey._id.toString(),
      respondentName: survey.respondentName,
      phoneNormalized: survey.phoneNormalized,
      completedAt: survey.completedAt,
      frameworkVersion: survey.frameworkVersion,
      answers: survey.answers,
      foundation: survey.foundation,
      result,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Load failed" });
  }
}
