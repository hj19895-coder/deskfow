import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const register = async (req, res) => {
  try {
    const { name, email, password, roleName } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Missing fields" });
    if (!email.includes("@")) return res.status(400).json({ message: "Invalid email" });
    if (password.length < 6) return res.status(400).json({ message: "Password too short" });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const role = await prisma.role.findUnique({ where: { name: roleName || "USER" } });
    if (!role) return res.status(400).json({ message: "Invalid role" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, roleId: role.id },
      include: { role: true },
    });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating user" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: { permissions: true },
        },
      },
    });


    // check user first
    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }


    console.log(
      "LOGIN USER ROLE:",
      JSON.stringify(user.role, null, 2)
    );


    if (!user.role) {
      return res.status(400).json({
        message: "User role not assigned"
      });
    }


    console.log("LOGIN EMAIL:", email);

    console.log("DB USER FOUND:", {
      id: user.id,
      email: user.email,
      passwordFromDB: user.password
    });
    
    console.log("PASSWORD ENTERED:", password);
    
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );
    
    console.log("PASSWORD MATCH:", isMatch);
    
    
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid password",
        debug: {
          entered: password,
          dbHashStart: user.password.substring(0,10)
        }
      });
    }


    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role.name
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );


    res.json({
      token,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,

        role: user.role.name,
        roleId: user.role.id,

        permissions:
          user.role.permissions ?? []
      }
    });


  } catch (err) {

    console.error("LOGIN ERROR:", err);

    res.status(500).json({
      message: "Login failed"
    });
  }
};
