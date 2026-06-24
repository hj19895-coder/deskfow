import express from "express";
import { register, login } from "../controllers/auth.controller.js";

const router = express.Router();

// router.post("/register", register);  // Removed - only SUPER_ADMIN can create users
router.post("/login", login);

export default router;

