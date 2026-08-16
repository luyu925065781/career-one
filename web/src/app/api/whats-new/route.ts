import { readFreshOffers } from "@/lib/career-one";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const days = Math.min(30, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 7));
  const offers = readFreshOffers(days);
  return Response.json({ offers, count: offers.length });
}
