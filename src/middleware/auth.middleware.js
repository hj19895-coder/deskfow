import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: {
          include: { permissions: true },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      userId:      user.id,
      role:        user.role.name,
      roleId:      user.role.id,
      isSystem:    user.role.isSystem,
      name:        user.name,
      email:       user.email,
      permissions: user.role.permissions ?? [],
    };

    next();
  } catch (err) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ message: "Super Admin access required" });
  }
  next();
};

export const requirePermission = (page, action = "canView") => {
  return (req, res, next) => {
    if (req.user?.role === "SUPER_ADMIN") return next();
    const perm = req.user?.permissions?.find(p => p.page === page);
    if (!perm || !perm[action]) {
      return res.status(403).json({
        message: `Access denied — '${action}' on '${page}' not permitted`,
      });
    }
    next();
  };
};


