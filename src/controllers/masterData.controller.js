import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Allowed MasterData types — add more here as the system grows
const ALLOWED_TYPES = new Set([
  "STATUS",
  "SOURCE",
  "LEVEL",
  "GROUP",
  "SEVERITY",
  "RAISED_BY",
  "SITE",
  "TICKET_TYPE",
  "CLIENT_NAME",
  "PRIORITY",
  "CATEGORY",
  "SUBCATEGORY",
  "ITEM",
  "ROOT_CAUSE_CATEGORY",
  "SEAT_EFFECTED",
  "CLIENT_CONFIRMATION",
  "DEPARTMENT",
  "dueDate"
]);

// ─── GET /master-data?type=TYPE ───────────────────────────────────────────────
// Public to any authenticated user — fetches active options for a dropdown type
export const getMasterData = async (req, res) => {
  try {
    const { type } = req.query;

    if (!type) {
      return res.status(400).json({ message: "Query param 'type' is required" });
    }

    const normalised = type.toUpperCase();
    if (!ALLOWED_TYPES.has(normalised)) {
      return res.status(400).json({
        message: `Unknown type '${type}'. Allowed: ${[...ALLOWED_TYPES].join(", ")}`,
      });
    }

    const items = await prisma.masterData.findMany({
      where: { type: normalised, isActive: true },
      orderBy: { value: "asc" },
      select: { id: true, value: true },
    });

    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching master data" });
  }
};

// ─── GET /master-data/all (SUPERADMIN) ────────────────────────────────────────
// Returns every entry (active + inactive) grouped by type — for the admin panel
export const getAllMasterData = async (req, res) => {
  try {

    const items = await prisma.masterData.findMany({
      orderBy: [{ type: "asc" }, { value: "asc" }],
    });

    // Group by type for convenience
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    }, {});

    res.json(grouped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching all master data" });
  }
};

// ─── POST /master-data (SUPERADMIN) ───────────────────────────────────────────
export const createMasterData = async (req, res) => {
  try {

    const { type, value } = req.body;

    if (!type || !value) {
      return res.status(400).json({ message: "Fields 'type' and 'value' are required" });
    }

    const normalised = type.toUpperCase().trim();
    const trimmedValue = value.trim();

    if (!ALLOWED_TYPES.has(normalised)) {
      return res.status(400).json({
        message: `Unknown type '${type}'. Allowed: ${[...ALLOWED_TYPES].join(", ")}`,
      });
    }

    // Upsert — if a soft-deleted entry exists, reactivate it
    const item = await prisma.masterData.upsert({
      where: { type_value: { type: normalised, value: trimmedValue } },
      update: { isActive: true },
      create: { type: normalised, value: trimmedValue, isActive: true },
    });

    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating master data entry" });
  }
};

// ─── DELETE /master-data/:id (SUPERADMIN) ─────────────────────────────────────
// Soft-delete: sets isActive = false so existing tickets keep their reference
export const deleteMasterData = async (req, res) => {
  try {

    const { id } = req.params;

    const existing = await prisma.masterData.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Entry not found" });
    }

    const updated = await prisma.masterData.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: "Entry deactivated", item: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting master data entry" });
  }
};
