import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { username, password, role, secretPassword } = await request.json();
    const normalizedUsername = typeof username === "string" ? username.trim() : "";

    if (!normalizedUsername || !password || !role) {
      return NextResponse.json(
        { error: "Username, password, and role are required." },
        { status: 400 }
      );
    }

    if (role !== "STUDENT" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Invalid role specified." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists." },
        { status: 400 }
      );
    }

    // Check admin secret password if admin role is selected
    if (role === "ADMIN") {
      try {
        const secretPath = path.join(process.cwd(), "..", "secret_password.txt");
        const correctSecret = fs.readFileSync(secretPath, "utf-8").trim();

        if (secretPassword !== correctSecret) {
          return NextResponse.json(
            { error: "Incorrect Admin Secret Password. Access Denied." },
            { status: 400 }
          );
        }
      } catch (err) {
        console.error("Error reading secret_password.txt:", err);
        return NextResponse.json(
          { error: "Server error checking admin privileges. Please contact administrator." },
          { status: 500 }
        );
      }
    }

    // Create user and hash password
    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        password: passwordHash,
        role,
        xp: {
          create: {
            totalXp: 0,
            unlockedModules: JSON.stringify(["mod_logic_gates", "mod_arithmetic"]),
          },
        },
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    // Set HTTP-only session cookie
    cookies().set("bitflow_session", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
