import { getArenaProblems } from "@/lib/db-loader";
import ArenaHubClient from "@/components/ArenaHubClient";

export const dynamic = "force-dynamic";

export default async function ArenaHubPage() {
  const problems = await getArenaProblems();

  return <ArenaHubClient problems={problems} />;
}
