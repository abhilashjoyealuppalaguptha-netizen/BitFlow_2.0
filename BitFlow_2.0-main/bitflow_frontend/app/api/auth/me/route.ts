import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessionCookie = cookies().get("bitflow_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionCookie },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      cookies().delete("bitflow_session");
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error("Session fetch error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
