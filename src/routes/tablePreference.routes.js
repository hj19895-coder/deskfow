import { Router } from "express";
import { getTablePreference, patchTablePreference } from "../controllers/tablePreference.controller.js";
import { protect } from "../middleware/auth.middleware.js";
const router = Router();

// GET /api/table-preferences/:pageKey
router.get("/table-preferences/:pageKey", protect, getTablePreference);

// PATCH /api/table-preferences/:pageKey
router.patch("/table-preferences/:pageKey", protect, patchTablePreference);

export default router;


