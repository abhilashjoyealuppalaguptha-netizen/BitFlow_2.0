import AuthGate from "@/components/AuthGate";

export default function ArenaLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
