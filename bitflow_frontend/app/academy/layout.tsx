import AuthGate from "@/components/AuthGate";

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
