import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { username, password, role } = await request.json();
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

    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 400 }
      );
    }

    // Student login should not fail because of a stale/wrong role toggle.
    // Admin login remains explicitly protected.
    if (role === "ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "This account is not registered as an ADMIN." },
        { status: 400 }
      );
    }

    // Verify password hash
    const inputHash = hashPassword(password);
    if (user.password !== inputHash) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 400 }
      );
    }

    // Set HTTP-only session cookie
    cookies().set("bitflow_session", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
