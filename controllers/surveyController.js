import mongoose from "mongoose";
import { SurveySubmission } from "../models/SurveySubmission.js";
import { loadFramework, getFrameworkVersion } from "../utils/loadFramework.js";
import { normalizePhone } from "../utils/phoneNormalize.js";
import {
  computeSurveyResult,
  validateComplete,
  getAllCapacityIds,
  getAllFoundationIds,
} from "../utils/computeSurvey.js";

function sanitizeAnswers(framework, raw) {
  const allowed = new Set(getAllCapacityIds(framework));
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const id of allowed) {
    const v = raw[id];
    if (v === 1 || v === 2 || v === 3) out[id] = v;
  }
  return out;
}

function sanitizeFoundation(framework, raw) {
  const allowed = new Set(getAllFoundationIds(framework));
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const id of allowed) {
    if (typeof raw[id] === "boolean") out[id] = raw[id];
  }
  return out;
}

function mergeObjects(base, patch) {
  return { ...base, ...patch };
}

export function getFramework(req, res) {
  try {
    const framework = loadFramework();
    res.json(framework);
  } catch (e) {
    res.status(500).json({ error: "Failed to load framework" });
  }
}

export async function lookup(req, res) {
  try {
    const phone = normalizePhone(req.body?.phone);
    if (!phone) {
      return res.status(400).json({ error: "Valid phone is required" });
    }
    const last = await SurveySubmission.findOne({
      phoneNormalized: phone,
      status: "completed",
    })
      .sort({ completedAt: -1 })
      .lean();

    if (!last) {
      return res.json({ hasPrevious: false });
    }

    const framework = loadFramework();
    const result = computeSurveyResult(framework, last.answers || {}, last.foundation || {});

    return res.json({
      hasPrevious: true,
      lastCompleted: {
        id: last._id.toString(),
        completedAt: last.completedAt,
        respondentName: last.respondentName,
        result,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Lookup failed" });
  }
}

export async function createSurvey(req, res) {
  try {
    const name = String(req.body?.name || "").trim();
    const phone = normalizePhone(req.body?.phone);
    if (!name || !phone) {
      return res.status(400).json({ error: "Name and valid phone are required" });
    }

    await SurveySubmission.updateMany(
      { phoneNormalized: phone, status: "in_progress" },
      { $set: { status: "abandoned" } }
    );

    const frameworkVersion = getFrameworkVersion();
    const doc = await SurveySubmission.create({
      respondentName: name,
      phoneNormalized: phone,
      status: "in_progress",
      frameworkVersion,
      answers: {},
      foundation: {},
      currentStageIndex: 0,
    });

    res.status(201).json({ surveyId: doc._id.toString() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not start survey" });
  }
}

export async function patchSurvey(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: "Survey not found or not editable" });
    }
    const phone = normalizePhone(req.body?.phone);
    if (!phone) {
      return res.status(400).json({ error: "Phone is required to update survey" });
    }

    const survey = await SurveySubmission.findById(req.params.id);
    if (!survey || survey.status !== "in_progress") {
      return res.status(404).json({ error: "Survey not found or not editable" });
    }
    if (survey.phoneNormalized !== phone) {
      return res.status(403).json({ error: "Phone does not match this survey" });
    }

    const framework = loadFramework();
    const patchAnswers = sanitizeAnswers(framework, req.body?.answers);
    const patchFoundation = sanitizeFoundation(framework, req.body?.foundation);

    if (Object.keys(patchAnswers).length > 0) {
      survey.answers = mergeObjects(survey.answers || {}, patchAnswers);
    }
    if (Object.keys(patchFoundation).length > 0) {
      survey.foundation = mergeObjects(survey.foundation || {}, patchFoundation);
    }
    if (typeof req.body?.currentStageIndex === "number" && req.body.currentStageIndex >= 0) {
      survey.currentStageIndex = req.body.currentStageIndex;
    }

    await survey.save();
    res.json({
      ok: true,
      surveyId: survey._id.toString(),
      currentStageIndex: survey.currentStageIndex,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Update failed" });
  }
}

export async function completeSurvey(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: "Survey not found or not completable" });
    }
    const phone = normalizePhone(req.body?.phone);
    if (!phone) {
      return res.status(400).json({ error: "Phone is required to complete survey" });
    }

    const survey = await SurveySubmission.findById(req.params.id);
    if (!survey || survey.status !== "in_progress") {
      return res.status(404).json({ error: "Survey not found or not completable" });
    }
    if (survey.phoneNormalized !== phone) {
      return res.status(403).json({ error: "Phone does not match this survey" });
    }

    const framework = loadFramework();
    const finalAnswers = mergeObjects(
      survey.answers || {},
      sanitizeAnswers(framework, req.body?.answers)
    );
    const finalFoundation = mergeObjects(
      survey.foundation || {},
      sanitizeFoundation(framework, req.body?.foundation)
    );

    survey.answers = finalAnswers;
    survey.foundation = finalFoundation;

    const { ok, missingCaps, missingFound } = validateComplete(
      framework,
      survey.answers,
      survey.foundation
    );
    if (!ok) {
      return res.status(400).json({
        error: "Incomplete survey",
        missingCaps,
        missingFound,
      });
    }

    survey.status = "completed";
    survey.completedAt = new Date();
    await survey.save();

    const result = computeSurveyResult(framework, survey.answers, survey.foundation);

    res.json({
      surveyId: survey._id.toString(),
      completedAt: survey.completedAt,
      result,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Complete failed" });
  }
}

/** Public: load completed survey by id if phone matches (e.g. refresh results). */
export async function getCompletedIfPhoneMatch(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: "Not found" });
    }
    const phone = normalizePhone(req.query.phone);
    if (!phone) {
      return res.status(400).json({ error: "phone query required" });
    }
    const survey = await SurveySubmission.findById(req.params.id).lean();
    if (!survey || survey.status !== "completed" || survey.phoneNormalized !== phone) {
      return res.status(404).json({ error: "Not found" });
    }
    const framework = loadFramework();
    const result = computeSurveyResult(framework, survey.answers || {}, survey.foundation || {});
    res.json({
      surveyId: survey._id.toString(),
      completedAt: survey.completedAt,
      respondentName: survey.respondentName,
      result,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load result" });
  }
}
