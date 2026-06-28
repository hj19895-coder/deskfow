// routes/notification.routes.js
const express = require("express");
const router = express.Router();

const {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} = require("../controllers/notification.controller");

// ⚠️ ADJUST: open your auth.middleware.js and use whatever it actually exports
// (commonly named `protect`, `verifyToken`, or `authenticate`)
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/:id/read", markRead);
router.patch("/read-all", markAllRead);

module.exports = router;

// In app.js, mount it alongside your other routes, e.g.:
//   app.use("/api/notifications", require("./routes/notification.routes"));