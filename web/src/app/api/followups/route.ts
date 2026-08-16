import { readFollowupSnapshot } from "@/lib/career-one";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await readFollowupSnapshot());
}
