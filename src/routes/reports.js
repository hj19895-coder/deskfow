import express from "express";
import { PrismaClient, Prisma } from "@prisma/client";

const router  = express.Router();
const prisma  = new PrismaClient();

// ─── SLA threshold by priority value (handles "P1", "P1 - Critical", etc.) ──
function getSlaHrs(priorityValue) {
  if (!priorityValue) return null;
  const v = priorityValue.toUpperCase();
  if (v.startsWith("P1")) return 0.75;
  if (v.startsWith("P2")) return 2;
  if (v.startsWith("P3")) return 5;
  if (v.startsWith("P4")) return 48;
  return null;
}

// ─── GET /api/reports/ticket-health ─────────────────────────────────────────
router.get("/ticket-health", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const now = new Date();

    // TODAY window
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    // WEEKLY window (last 7 days including today)
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(todayEnd);

    // CUSTOM window (if provided)
    const customStart = startDate ? new Date(startDate) : null;
    const customEnd   = endDate   ? new Date(endDate)   : null;
    if (customEnd) customEnd.setHours(23, 59, 59, 999);

    const [todayData, weeklyData, customData] = await Promise.all([
      fetchHealthMetrics(todayStart, todayEnd, { includeSnapshots: true }),
      fetchHealthMetrics(weekStart,  weekEnd,  { includeSnapshots: false }),
      customStart && customEnd
        ? fetchHealthMetrics(customStart, customEnd, { includeSnapshots: false })
        : Promise.resolve(null),
    ]);

    res.json({
      today:  todayData,
      weekly: weeklyData,
      ...(customData && { custom: customData }),
      meta: {
        generatedAt: now.toISOString(),
        todayRange:  { start: todayStart, end: todayEnd },
        weeklyRange: { start: weekStart,  end: weekEnd  },
        ...(customStart && customEnd && {
          customRange: { start: customStart, end: customEnd },
        }),
      },
    });
  } catch (err) {
    console.error("[reports/ticket-health]", err);
    res.status(500).json({ error: "Failed to generate report", details: err.message });
  }
});

// ─── Core metrics for a date window ─────────────────────────────────────────
async function fetchHealthMetrics(start, end, { includeSnapshots = true } = {}) {

  const [closedStatusRecords, excludedStatusRecords, p1Records] = await Promise.all([
    prisma.masterData.findMany({
      where: { type: "STATUS", value: { in: ["Closed", "Resolved"] } },
      select: { id: true },
    }),
    prisma.masterData.findMany({
      where: {
        type:  "STATUS",
        value: { in: ["Confirmation Awaiting", "Confirmation_awaiting", "Onhold", "On-hold", "Closed", "Resolved"] },
      },
      select: { id: true },
    }),
    prisma.masterData.findMany({
      where: { type: "PRIORITY", value: { startsWith: "P1" } },
      select: { id: true },
    }),
  ]);

  const closedIds   = closedStatusRecords.map((r) => r.id);
  const excludedIds = excludedStatusRecords.map((r) => r.id);
  const p1Ids       = p1Records.map((r) => r.id);

  const [
    totalOpenStart,
    raised,
    closed,
    closedWithinSla,
    totalOpenNow,
    activeOpen,
    openP1,
    reopened,
    overallClosed,
    overallClosedWithinSla,
    resolvedTickets,
    openSlaBreached,
  ] = await Promise.all([

    prisma.ticket.count({
      where: {
        createdAt: { lt: start },
        statusId:  { notIn: closedIds },
        isMerged:  false,
      },
    }),

    prisma.ticket.count({
      where: {
        createdAt: { gte: start, lte: end },
        isMerged:  false,
      },
    }),

    prisma.ticket.count({
      where: {
        statusId:      { in: closedIds },
        completedDate: { gte: start, lte: end },
        isMerged:      false,
      },
    }),

    prisma.$queryRaw(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "Ticket" t
      JOIN "MasterData" s ON s.id = t."statusId"
      JOIN "MasterData" p ON p.id = t."priorityId"
      WHERE s.value IN ('Closed', 'Resolved')
        AND t."completedDate" >= ${start}
        AND t."completedDate" <= ${end}
        AND t."isMerged" = false
        AND t."completedDate" IS NOT NULL
        AND EXTRACT(EPOCH FROM (t."completedDate" - t."createdAt")) / 3600 <= CASE
              WHEN p.value ILIKE 'P1%' THEN 0.75
              WHEN p.value ILIKE 'P2%' THEN 2
              WHEN p.value ILIKE 'P3%' THEN 5
              WHEN p.value ILIKE 'P4%' THEN 48
              ELSE 48
            END
    `).then((r) => Number(r[0]?.count ?? 0)),

    includeSnapshots
      ? prisma.ticket.count({
          where: { statusId: { notIn: closedIds }, isMerged: false },
        })
      : Promise.resolve(null),

    includeSnapshots
      ? prisma.ticket.count({
          where: { statusId: { notIn: excludedIds }, isMerged: false },
        })
      : Promise.resolve(null),

    includeSnapshots && p1Ids.length > 0
      ? prisma.ticket.count({
          where: {
            priorityId: { in: p1Ids },
            statusId:   { notIn: closedIds },
            isMerged:   false,
          },
        })
      : Promise.resolve(null),

    prisma.ticket.count({
      where: {
        reopened:      true,
        statusId:      { in: closedIds },
        completedDate: { gte: start, lte: end },
        isMerged:      false,
      },
    }),

    prisma.ticket.count({
      where: { statusId: { in: closedIds }, isMerged: false },
    }),

    prisma.$queryRaw(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "Ticket" t
      JOIN "MasterData" s ON s.id = t."statusId"
      JOIN "MasterData" p ON p.id = t."priorityId"
      WHERE s.value IN ('Closed', 'Resolved')
        AND t."isMerged" = false
        AND t."completedDate" IS NOT NULL
        AND EXTRACT(EPOCH FROM (t."completedDate" - t."createdAt")) / 3600 <= CASE
              WHEN p.value ILIKE 'P1%' THEN 0.75
              WHEN p.value ILIKE 'P2%' THEN 2
              WHEN p.value ILIKE 'P3%' THEN 5
              WHEN p.value ILIKE 'P4%' THEN 48
              ELSE 48
            END
    `).then((r) => Number(r[0]?.count ?? 0)),

    prisma.ticket.findMany({
      where: {
        statusId:      { in: closedIds },
        completedDate: { gte: start, lte: end },
        isMerged:      false,
      },
      select: { createdAt: true, completedDate: true },
    }),

    includeSnapshots
      ? prisma.$queryRaw(Prisma.sql`
          SELECT COUNT(*)::int AS count
          FROM "Ticket" t
          JOIN "MasterData" s ON s.id = t."statusId"
          JOIN "MasterData" p ON p.id = t."priorityId"
          WHERE s.value NOT IN ('Closed', 'Resolved')
            AND t."isMerged" = false
            AND EXTRACT(EPOCH FROM (NOW() - t."createdAt")) / 3600 > CASE
                  WHEN p.value ILIKE 'P1%' THEN 0.75
                  WHEN p.value ILIKE 'P2%' THEN 2
                  WHEN p.value ILIKE 'P3%' THEN 5
                  WHEN p.value ILIKE 'P4%' THEN 48
                  ELSE 48
                END
        `).then((r) => Number(r[0]?.count ?? 0))
      : Promise.resolve(null),
  ]);

  const avgResolutionHrs = (() => {
    const valid = resolvedTickets.filter(
      (t) => t.completedDate && t.createdAt &&
             new Date(t.completedDate) > new Date(t.createdAt)
    );
    if (!valid.length) return null;
    const totalHrs = valid.reduce(
      (sum, t) => sum + (new Date(t.completedDate) - new Date(t.createdAt)) / 36e5,
      0
    );
    return Math.round((totalHrs / valid.length) * 100) / 100;
  })();

  const pct = (num, den) =>
    den > 0 ? Math.round((num / den) * 10000) / 100 : null;

  const slaCompliance        = pct(closedWithinSla,       closed);
  const overallSlaCompliance = pct(overallClosedWithinSla, overallClosed);
  const reopenRate           = pct(reopened,               closed);

  return {
    totalOpenStart,
    raised,
    closed,
    closedWithinSla,
    slaCompliance,
    totalOpenNow,
    activeOpen,
    openP1,
    openSlaBreached,
    overallSlaCompliance,
    avgResolutionHrs,
    reopenRate,
  };
}

// ─── GET /api/reports/developer-pending ─────────────────────────────────────
router.get("/developer-pending", async (req, res) => {
  try {
    const now = new Date();

    const allStatuses = await prisma.masterData.findMany({
      where: {
        type:     "STATUS",
        value:    { notIn: ["Closed", "Resolved"] },
        isActive: true,
      },
      select:  { value: true },
      orderBy: { value: "asc" },
    });

    const statusColumns = allStatuses.map((s) => s.value);

    const tickets = await prisma.ticket.findMany({
      where: {
        isMerged: false,
        status: { value: { notIn: ["Closed", "Resolved"] } },
      },
      select: {
        assignedTo: { select: { name: true } },
        status:     { select: { value: true } },
      },
    });

    const pivot = {};
    const ensureDeveloper = (dev) => {
      if (!pivot[dev]) {
        pivot[dev] = {};
        for (const col of statusColumns) {
          pivot[dev][col] = 0;
        }
      }
    };

    for (const t of tickets) {
      const dev    = t.assignedTo?.name ?? "Unassigned";
      const status = t.status?.value    ?? "Unknown";
      ensureDeveloper(dev);
      pivot[dev][status] = (pivot[dev][status] || 0) + 1;
    }

    const rows = Object.entries(pivot)
      .sort(([a], [b]) => {
        if (a === "Unassigned") return 1;
        if (b === "Unassigned") return -1;
        return a.localeCompare(b);
      })
      .map(([developer, counts]) => ({
        developer,
        counts,
        total: Object.values(counts).reduce((s, v) => s + v, 0),
      }));

    res.json({ rows, statusColumns, generatedAt: now.toISOString() });
  } catch (err) {
    console.error("[reports/developer-pending]", err);
    res.status(500).json({ error: "Failed to generate report", details: err.message });
  }
});

// ─── GET /api/reports/client-status ─────────────────────────────────────────
router.get("/client-status", async (req, res) => {
  try {
    const now = new Date();

    // 1. Fetch all active non-closed statuses from MasterData
    //    These become the columns — ensures every status appears even with 0 tickets
    const allStatuses = await prisma.masterData.findMany({
      where: {
        type:     "STATUS",
        value:    { notIn: ["Closed", "Resolved"] },
        isActive: true,
      },
      select:  { value: true },
      orderBy: { value: "asc" },
    });

    const statusColumns = allStatuses.map((s) => s.value);

    // 2. Fetch all open tickets with their client + status
    const tickets = await prisma.ticket.findMany({
      where: {
        isMerged: false,
        status:   { value: { notIn: ["Closed", "Resolved"] } },
      },
      select: {
        clientName: { select: { value: true } },
        status:     { select: { value: true } },
      },
    });

    // 3. Build pivot — initialise every client with 0 for ALL status columns,
    //    then increment from actual ticket data
    const pivot = {};

    const ensureClient = (client) => {
      if (!pivot[client]) {
        pivot[client] = {};
        for (const col of statusColumns) {
          pivot[client][col] = 0;
        }
      }
    };

    for (const t of tickets) {
      const client = t.clientName?.value ?? "Unassigned";
      const status = t.status?.value     ?? "Unknown";
      ensureClient(client);
      // guard: status may not be in our column list (e.g. stale data)
      if (pivot[client][status] !== undefined) {
        pivot[client][status] += 1;
      } else {
        pivot[client][status] = 1;
      }
    }

    // 4. Sort rows: real clients first (alpha), sink rows last
    const SINK = new Set(["Unassigned", "Other", "Unknown"]);
    const rows = Object.entries(pivot)
      .sort(([a], [b]) => {
        const aS = SINK.has(a), bS = SINK.has(b);
        if (aS && !bS) return 1;
        if (!aS && bS) return -1;
        return a.localeCompare(b);
      })
      .map(([client, counts]) => ({
        client,
        counts,
        total: Object.values(counts).reduce((s, v) => s + v, 0),
      }));

    res.json({
      rows,
      statusColumns, // frontend can use this for dynamic column rendering
      generatedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("[reports/client-status]", err);
    res.status(500).json({ error: "Failed to generate report", details: err.message });
  }
});

export default router;
