/**
 * lib/jwt.ts — Server-side JWT generation for backend auth
 *
 * This module runs ONLY on the server (Next.js API routes).
 * The JWT_SECRET never reaches the browser.
 *
 * Each token is short-lived (60 seconds) and used for a single
 * simulation request from Next.js → FastAPI.
 */

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "bitflow-dev-secret-change-in-production";

/**
 * Generate a short-lived JWT for authenticating with the FastAPI backend.
 * Called server-side only (from Next.js API routes).
 */
export function generateBackendJwt(): string {
  return jwt.sign(
    {
      iss: "bitflow-frontend",
      purpose: "simulate",
    },
    JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "60s",
    }
  );
}
