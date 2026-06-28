// controllers/notification.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ⚠️ ADJUST: keep in sync with utils/notification.js
const ADMIN_ROLE_NAMES = ["SUPER_ADMIN", "ADMIN"];

function isAdminLike(req) {
  return ADMIN_ROLE_NAMES.includes(req.user?.role?.name);
}

// GET /api/notifications
// SuperAdmin/Admin: returns ALL notifications across all users.
// Everyone else: only their own.
async function getNotifications(req, res) {
  try {
    const userId = req.user.id;
    const admin = isAdminLike(req);

    const notifications = await prisma.notification.findMany({
      where: admin ? {} : { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, name: true } },
        ticket: { select: { id: true, ticketNumber: true, subject: true } },
      },
    });

    res.json({ notifications, viewingAll: admin });
  } catch (err) {
    console.error("getNotifications error:", err);
    res.status(500).json({ message: "Failed to load notifications" });
  }
}

// GET /api/notifications/unread-count
// Always scoped to the current user, even for admins — keeps the badge meaningful.
async function getUnreadCount(req, res) {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    res.json({ count });
  } catch (err) {
    console.error("getUnreadCount error:", err);
    res.status(500).json({ message: "Failed to load unread count" });
  }
}

// PATCH /api/notifications/:id/read
async function markRead(req, res) {
  try {
    const { id } = req.params;
    // Ownership check baked into the query — you can't mark someone else's notification read,
    // even as an admin viewing the global list.
    const updated = await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { isRead: true },
    });
    if (updated.count === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("markRead error:", err);
    res.status(500).json({ message: "Failed to mark as read" });
  }
}

// PATCH /api/notifications/read-all
async function markAllRead(req, res) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    console.error("markAllRead error:", err);
    res.status(500).json({ message: "Failed to mark all as read" });
  }
}

module.exports = { getNotifications, getUnreadCount, markRead, markAllRead };