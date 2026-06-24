import express from "express";
import { createUser, getUsers, deleteUser } from "../controllers/user.controller.js";
import { protect, requireSuperAdmin, requirePermission } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/",       protect, requirePermission("users", "canView"),   getUsers);
router.post("/",      protect, requirePermission("users", "canCreate"), createUser);
router.delete("/:id", protect, requirePermission("users", "canDelete"), deleteUser);

export default router;