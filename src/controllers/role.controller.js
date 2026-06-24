import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const ALL_PAGES = ["dashboard", "tickets", "users", "master-data", "reports"];

export const getRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: { permissions: true, _count: { select: { users: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json({ roles });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch roles" });
  }
};

export const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    // permissions: [{ page, canView, canCreate, canEdit, canDelete }]
    if (!name?.trim()) return res.status(400).json({ message: "Role name required" });

    const role = await prisma.role.create({
      data: {
        name: name.trim().toUpperCase().replace(/\s+/g, "_"),
        description,
        permissions: {
          create: ALL_PAGES.map(page => {
            const p = permissions?.find(x => x.page === page) ?? {};
            return {
              page,
              canView:   p.canView   ?? false,
              canCreate: p.canCreate ?? false,
              canEdit:   p.canEdit   ?? false,
              canDelete: p.canDelete ?? false,
            };
          }),
        },
      },
      include: { permissions: true },
    });
    res.status(201).json({ role });
  } catch (err) {
    if (err.code === "P2002") return res.status(400).json({ message: "Role name already exists" });
    res.status(500).json({ message: "Failed to create role" });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Role not found" });
    if (existing.isSystem) return res.status(403).json({ message: "Cannot modify system role" });

    // Update permissions via upsert
    const role = await prisma.role.update({
      where: { id },
      data: {
        name: name?.trim().toUpperCase().replace(/\s+/g, "_"),
        description,
        permissions: {
          upsert: ALL_PAGES.map(page => {
            const p = permissions?.find(x => x.page === page) ?? {};
            const data = {
              canView:   p.canView   ?? false,
              canCreate: p.canCreate ?? false,
              canEdit:   p.canEdit   ?? false,
              canDelete: p.canDelete ?? false,
            };
            return { where: { roleId_page: { roleId: id, page } }, update: data, create: { page, ...data } };
          }),
        },
      },
      include: { permissions: true },
    });
    res.json({ role });
  } catch (err) {
    res.status(500).json({ message: "Failed to update role" });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
    if (!role) return res.status(404).json({ message: "Role not found" });
    if (role.isSystem) return res.status(403).json({ message: "Cannot delete system role" });
    if (role._count.users > 0) return res.status(400).json({ message: `Cannot delete — ${role._count.users} user(s) assigned` });

    await prisma.role.delete({ where: { id } });
    res.json({ message: "Role deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete role" });
  }
};

export const getRolePermissions = async (req, res) => {
  try {
    const perms = await prisma.rolePermission.findMany({ where: { roleId: req.params.id } });
    res.json({ permissions: perms });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch permissions" });
  }
};