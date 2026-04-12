import { Router } from "express";
import { rateLimit } from "../middleware/rateLimit.js";
import * as survey from "../controllers/surveyController.js";

const router = Router();
const strict = rateLimit({ windowMs: 60_000, max: 40, keySuffix: "survey" });

router.get("/framework", survey.getFramework);
router.post("/lookup", strict, survey.lookup);
router.post("/", strict, survey.createSurvey);
router.patch("/:id", strict, survey.patchSurvey);
router.post("/:id/complete", strict, survey.completeSurvey);
router.get("/completed/:id", strict, survey.getCompletedIfPhoneMatch);

export default router;
