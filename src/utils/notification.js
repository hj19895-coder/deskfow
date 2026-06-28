// utils/notification.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ⚠️ ADJUST: if your SuperAdmin/Admin roles are named differently in the Role table
const ADMIN_ROLE_NAMES = ["SUPER_ADMIN", "ADMIN"];

/**
 * Returns ids of all SuperAdmin/Admin users, optionally excluding one (the actor).
 */
async function getAdminUserIds(excludeUserId) {
  const admins = await prisma.user.findMany({
    where: { role: { name: { in: ADMIN_ROLE_NAMES } } },
    select: { id: true },
  });
  return admins.map((a) => a.id).filter((id) => id !== excludeUserId);
}

/**
 * Low-level insert. Creates one notification row per recipient.
 */
async function notify({ userIds, type, title, message, ticketId }) {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  if (uniqueIds.length === 0) return;
  await prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({ userId, type, title, message, ticketId })),
  });
}

/**
 * Main helper for ticket lifecycle events.
 *
 * Sends to:
 *  - the target user (e.g. ticket creator, newly assigned technician)
 *  - every SuperAdmin / Admin user
 * deduped, and never to the person who triggered the action (actorUserId).
 *
 * type examples (also drives the icon/color in the frontend):
 *   TICKET_CREATED | TICKET_ASSIGNED | STATUS_CHANGED | SLA_BREACH | TICKET_MERGED
 */
async function notifyTicketEvent({ type, title, message, ticketId, targetUserId, actorUserId }) {
  const recipientIds = new Set();
  if (targetUserId && targetUserId !== actorUserId) recipientIds.add(targetUserId);

  const adminIds = await getAdminUserIds(actorUserId);
  adminIds.forEach((id) => recipientIds.add(id));

  await notify({ userIds: [...recipientIds], type, title, message, ticketId });
}

module.exports = { notify, notifyTicketEvent, getAdminUserIds };