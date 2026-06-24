import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /table-preferences?pageKey=... 
// Returns user preference for the given pageKey.
const validatePayload = (payload) => {
  if (!payload || typeof payload !== 'object') return { ok: false, message: 'Invalid body' };

  const { visibleColumns, columnWidths, columnOrder } = payload;

  // visibleColumns expected as array of column keys or null/undefined
  const visibleOk =
    visibleColumns === undefined ||
    visibleColumns === null ||
    (Array.isArray(visibleColumns) || typeof visibleColumns === 'object');

  // columnWidths expected as object map: { [colKey]: number }
  const widthsOk =
    columnWidths === undefined ||
    columnWidths === null ||
    (typeof columnWidths === 'object' && !Array.isArray(columnWidths));

  const orderOk =
    columnOrder === undefined ||
    columnOrder === null ||
    (Array.isArray(columnOrder) || typeof columnOrder === 'object');

  if (!visibleOk) return { ok: false, message: 'visibleColumns must be an array or object' };
  if (!widthsOk) return { ok: false, message: 'columnWidths must be an object' };
  if (!orderOk) return { ok: false, message: 'columnOrder must be an array or object' };

  return { ok: true };
};

export const getTablePreference = async (req, res) => {
  try {
    const { pageKey } = req.params;
    const userId = req.user?.userId;

    if (!pageKey) return res.status(400).json({ message: 'pageKey is required' });
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const pref = await prisma.userTablePreference.findUnique({
      where: { userId_pageKey: { userId, pageKey } },
    });

    // Return defaults if no preference exists
    return res.json(
      pref ?? {
        visibleColumns: [],
        columnWidths: {},
        columnOrder: null,
        pageKey,
      }
    );
  } catch (error) {
    console.error("getTablePreference failed:", error);

    return res.status(500).json({
      message: 'Error fetching table preference',
      error: error.message,
    });
  }
};

export const patchTablePreference = async (req, res) => {
  try {
    const { pageKey } = req.params;
    const userId = req.user?.userId;

    if (!pageKey) return res.status(400).json({ message: 'pageKey is required' });
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const validation = validatePayload(req.body);
    if (!validation.ok) return res.status(400).json({ message: validation.message });

    const { visibleColumns, columnWidths, columnOrder } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      return tx.userTablePreference.upsert({
        where: { userId_pageKey: { userId, pageKey } },
        update: {
          visibleColumns: visibleColumns ?? [],
          columnWidths: columnWidths ?? {},
          columnOrder: columnOrder ?? null,
        },
        create: {
          userId,
          pageKey,
          visibleColumns: visibleColumns ?? [],
          columnWidths: columnWidths ?? {},
          columnOrder: columnOrder ?? null,
        },
      });
    });

    return res.json(updated);
  } catch (error) {
    console.error("patchTablePreference failed:", error);

    return res.status(500).json({
      message: 'Error saving table preference',
      error: error.message,
    });
  }
};


