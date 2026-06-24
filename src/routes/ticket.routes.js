import express from "express";
import {
  createTicket, getTickets, getTicketById,
  assignTicket, updateTicket, mergeTickets, getTicketStats, getTicketUsers,
} from "../controllers/ticket.controller.js";
import { protect, requirePermission } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/stats",   protect,                                        getTicketStats);
router.get("/users",   protect,                                        getTicketUsers);
router.get("/",        protect, requirePermission("tickets","canView"), getTickets);
router.post("/merge",  protect, requirePermission("tickets","canEdit"), mergeTickets);
router.get("/:id",     protect, requirePermission("tickets","canView"), getTicketById);
router.post("/",       protect, requirePermission("tickets","canCreate"), createTicket);
router.put("/assign",  protect, requirePermission("tickets","canEdit"), assignTicket);
router.patch("/:id",   protect, requirePermission("tickets","canEdit"), updateTicket);

export default router;