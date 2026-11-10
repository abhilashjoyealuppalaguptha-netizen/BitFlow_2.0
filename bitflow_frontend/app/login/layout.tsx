import { Suspense } from "react";

// Metadata, plus the Suspense boundary the page's useSearchParams needs.
export const metadata = {
  title: "Sign in or create an account",
  description: "Create a free BitFlow account to save your progress, solve graded Verilog problems and join classes and contests.",
  alternates: { canonical: "/login" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-void" />}>{children}</Suspense>;
}
