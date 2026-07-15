import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SALT = "bitflow_salt_2026_secure";

/**
 * Hash a password using PBKDF2.
 * Secure, dependency-free, works on all platforms.
 */
export function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, SALT, 1000, 64, "sha512").toString("hex");
}

export async function getSessionUser() {
  const sessionCookie = cookies().get("bitflow_session")?.value;
  if (!sessionCookie) return null;

  return prisma.user.findUnique({
    where: { id: sessionCookie },
    select: {
      id:        true,
      username:  true,
      role:      true,
      createdAt: true,
    },
  });
}
