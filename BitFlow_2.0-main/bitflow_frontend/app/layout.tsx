/**
 * app/layout.tsx — Root layout
 *
 * In Next.js App Router, layout.tsx wraps every page.
 * This root layout:
 *   • Sets <html> and <body> attributes.
 *   • Applies CSS font variables.
 *   • Sets page metadata (title, description, viewport).
 *   • Imports globals.css (once, at the root).
 *
 * It does NOT add any visible UI — that lives in page.tsx.
 */

import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";

// ─────────────────────────────────────────────────────────────────────────────
// Metadata — affects <head> on every page
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       "BitFlow",
  description: "BitFlow — browser-based Icarus Verilog compiler and simulator.",
  icons: {
    icon: "/bitflow_logo_2.png",
  },
};

export const viewport: Viewport = {
  width:        "device-width",
  initialScale: 1,
  // Prevent browser zoom on mobile input focus
  maximumScale: 1,
};

// ─────────────────────────────────────────────────────────────────────────────
// Layout component
// ─────────────────────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-y-auto bg-void text-bright font-mono antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
