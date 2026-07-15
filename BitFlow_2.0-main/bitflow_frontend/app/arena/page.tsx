import { getArenaProblems } from "@/lib/db-loader";
import ArenaHubClient from "@/components/ArenaHubClient";
import AuthGate from "@/components/AuthGate";

export const dynamic = "force-dynamic";

export default async function ArenaHubPage() {
  const problems = await getArenaProblems();

  return (
    <AuthGate>
      <ArenaHubClient problems={problems} />
    </AuthGate>
  );
}