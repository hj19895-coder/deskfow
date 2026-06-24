import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── GET /api/users ────────────────────────────────────────────────────────────
export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: {
          include: { permissions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const sanitized = users.map((u) => ({
      id:        u.id,
      name:      u.name,
      email:     u.email,
      createdAt: u.createdAt,
      role: {
        id:          u.role.id,
        name:        u.role.name,
        description: u.role.description,
        isSystem:    u.role.isSystem,
        permissions: u.role.permissions,
      },
    }));

    res.json({ users: sanitized });
  } catch (err) {
    console.error("getUsers error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

// ── POST /api/users ───────────────────────────────────────────────────────────
export const createUser = async (req, res) => {
  try {
    const { name, email, password, roleId } = req.body;

    if (!name || !email || !password || !roleId) {
      return res.status(400).json({ message: "name, email, password and roleId are all required" });
    }

    // Verify role exists
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(400).json({ message: "Selected role does not exist" });
    }

    // Prevent assigning SUPER_ADMIN role via this endpoint
    if (role.isSystem) {
      return res.status(403).json({ message: "Cannot assign a system role to a new user" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        roleId,
      },
      include: {
        role: {
          include: { permissions: true },
        },
      },
    });

    res.status(201).json({
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        role: {
          id:          user.role.id,
          name:        user.role.name,
          description: user.role.description,
          isSystem:    user.role.isSystem,
          permissions: user.role.permissions,
        },
      },
    });
  } catch (err) {
    console.error("createUser error:", err);
    if (err.code === "P2002") {
      return res.status(400).json({ message: "A user with this email already exists" });
    }
    res.status(500).json({ message: "Failed to create user" });
  }
};

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user.userId) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: { permissions: true },
        },
      },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role.isSystem) {
      return res.status(403).json({ message: "Cannot delete a system user" });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
};