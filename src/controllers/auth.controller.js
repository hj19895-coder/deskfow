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
      where: { 
        email: email 
      },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });


    if (!user) {
      return res.status(400).json({
        step: "USER_LOOKUP_FAILED",
        receivedEmail: email
      });
    }


    const passwordCheck = await bcrypt.compare(
      password,
      user.password
    );


    if (!passwordCheck) {
      return res.status(400).json({
        step: "PASSWORD_FAILED",
        enteredPassword: password,
        dbPasswordLength: user.password.length,
        dbPasswordStart: user.password.substring(0, 10)
      });
    }


    if (!user.role) {
      return res.status(400).json({
        step: "ROLE_FAILED",
        roleId: user.roleId
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


    return res.json({
      success:true,
      token,
      user:{
        id:user.id,
        email:user.email,
        name:user.name,
        role:user.role.name
      }
    });


  } catch(error){

    return res.status(500).json({
      step:"SERVER_ERROR",
      error:error.message
    });

  }
};
