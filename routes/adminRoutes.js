import { Router } from "express";
import { rateLimit } from "../middleware/rateLimit.js";
import { adminAuth } from "../middleware/adminAuth.js";
import * as admin from "../controllers/adminController.js";

const router = Router();

router.post("/login", rateLimit({ windowMs: 60_000, max: 20, keySuffix: "adminlogin" }), admin.login);
router.get("/surveys", adminAuth, admin.listSurveys);
router.get("/surveys/:id", adminAuth, admin.getSurvey);

export default router;
