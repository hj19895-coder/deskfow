import express from "express";
import {
  getRoles, createRole, updateRole, deleteRole, getRolePermissions
} from "../controllers/role.controller.js";
import { protect, requireSuperAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getRoles);
router.post("/",         protect, requireSuperAdmin, createRole);
router.put("/:id",       protect, requireSuperAdmin, updateRole);
router.delete("/:id",    protect, requireSuperAdmin, deleteRole);
router.get("/:id/permissions", protect, requireSuperAdmin, getRolePermissions);

export default router;