/** app/loading.tsx — shown while a page's server render streams in after a navigation. */

import PixelLoader from "@/components/pixel/PixelLoader";

export default function Loading() {
  return (
    <main className="min-h-screen bg-void flex items-center justify-center">
      <PixelLoader size="lg" label="Loading…" />
    </main>
  );
}
