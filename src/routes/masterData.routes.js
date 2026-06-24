import express from "express";
import {
  getMasterData,
  getAllMasterData,
  createMasterData,
  deleteMasterData,
} from "../controllers/masterData.controller.js";
import { protect, requirePermission } from "../middleware/auth.middleware.js";

const router = express.Router();

// Any authenticated user — fetch active options for a single type
router.get("/", protect, getMasterData);

// SUPERADMIN — manage all entries
router.get("/all",    protect, requirePermission("master-data", "canView"),   getAllMasterData);
router.post("/",      protect, requirePermission("master-data", "canCreate"), createMasterData);
router.delete("/:id", protect, requirePermission("master-data", "canDelete"), deleteMasterData);

export default router;
