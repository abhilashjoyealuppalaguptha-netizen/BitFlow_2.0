import AuthGate from "@/components/AuthGate";

export default function ProblemsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
