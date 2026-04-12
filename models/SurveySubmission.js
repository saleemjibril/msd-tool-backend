import mongoose from "mongoose";

const surveySubmissionSchema = new mongoose.Schema(
  {
    respondentName: { type: String, required: true, trim: true },
    phoneNormalized: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["in_progress", "completed", "abandoned"],
      default: "in_progress",
    },
    frameworkVersion: { type: String, required: true },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    foundation: { type: mongoose.Schema.Types.Mixed, default: {} },
    currentStageIndex: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

surveySubmissionSchema.index({ phoneNormalized: 1, status: 1, completedAt: -1 });

export const SurveySubmission =
  mongoose.models.SurveySubmission || mongoose.model("SurveySubmission", surveySubmissionSchema);
