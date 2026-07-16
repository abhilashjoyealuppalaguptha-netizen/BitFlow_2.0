import AuthGate from "@/components/AuthGate";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
