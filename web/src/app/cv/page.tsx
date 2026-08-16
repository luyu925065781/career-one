import { CvEditor } from "@/components/cv-editor";
import { doctorState, readStoryBank } from "@/lib/career-one";

export const dynamic = "force-dynamic";

export default function CvPage() {
  const { stories } = readStoryBank();
  const { profileReady } = doctorState();
  return <CvEditor storyCount={stories.length} profileReady={profileReady} />;
}
