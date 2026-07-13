import fs from "node:fs";
import { ExplorerView } from "@/components/explore/explorer-view";
import { seedExploreFilters } from "@/lib/core/portals";
import { readInbox, readApplications, careerOneRoot } from "@/lib/career-one";
import { DEFAULT_FILTERS } from "@/lib/explore";

// Read live data at request time so a bare checkout (or `next build` with no
// CAREER_ONE_ROOT) never fails — discovery seeds are best-effort.
export const dynamic = "force-dynamic";

export default function ExplorePage() {
  let seed: { filters: typeof DEFAULT_FILTERS; seededFrom: string[] } = { filters: DEFAULT_FILTERS, seededFrom: [] };
  try {
    seed = seedExploreFilters();
  } catch {
    /* bare checkout → defaults */
  }
  let rootExists = false;
  try {
    rootExists = fs.existsSync(careerOneRoot());
  } catch {
    /* ignore */
  }
  return (
    <ExplorerView seed={seed} inboxSnapshot={readInbox()} appsSnapshot={readApplications()} rootExists={rootExists} />
  );
}
