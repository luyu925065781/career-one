import {
  pipelineSummary,
  doctorState,
  readFollowupSnapshot,
  readFreshOffers,
  readStoryBank,
} from "@/lib/career-one";
import { TodayDashboard } from "@/components/home/today-dashboard";

export const dynamic = "force-dynamic"; // always read fresh local files at request time (never at build — CI has no user data)

export default async function Home() {
  const { missing, hasCv } = doctorState();
  const { inbox, applications } = pipelineSummary();
  const stories = readStoryBank().stories;
  const storyCount = stories.length;
  const [followupSnapshot, initialFresh] = await Promise.all([
    readFollowupSnapshot(),
    readFreshOffers(),
  ]);
  const initialFollowupCount =
    (followupSnapshot.metadata?.overdue ?? 0)
    + (followupSnapshot.metadata?.urgent ?? 0);
  // Every lifecycle phase shares the same Dashboard. A truly empty workspace
  // starts at 0/3 in the onboarding card instead of being diverted to a separate
  // first-run page; the explicit profile step precedes interview stories.
  return (
    <TodayDashboard
      applications={applications}
      inbox={inbox}
      hasCv={hasCv}
      storyCount={storyCount}
      setupMissing={missing}
      initialFollowups={followupSnapshot.entries}
      initialFollowupCount={initialFollowupCount}
      initialFresh={initialFresh}
    />
  );
}
