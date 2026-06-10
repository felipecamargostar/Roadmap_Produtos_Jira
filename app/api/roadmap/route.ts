/**
 * GET /api/roadmap
 *
 * Fetches Cycle 2 epics from Jira in parallel and transforms them into
 * the RoadmapData shape consumed by the frontend.
 *
 * Cached for 5 minutes (revalidate: 300) via Next.js.
 * Requires env vars: JIRA_EMAIL, JIRA_API_TOKEN (set in Vercel dashboard).
 */
import { NextResponse } from "next/server";
import { fetchAllEpics, fetchActiveSprintIssues, fetchNextSprintIssues, fetchAtlasGoals } from "@/lib/jira";
import { transformToRoadmap } from "@/lib/transform";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 minutes

export async function GET() {
  const missing = ["JIRA_EMAIL", "JIRA_API_TOKEN"].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing env vars: ${missing.join(", ")}` },
      { status: 500 }
    );
  }

  let epics: Awaited<ReturnType<typeof fetchAllEpics>> = [];
  let activeStories: Awaited<ReturnType<typeof fetchActiveSprintIssues>> = [];
  let nextStories: Awaited<ReturnType<typeof fetchNextSprintIssues>> = [];
  let atlasGoals: Awaited<ReturnType<typeof fetchAtlasGoals>> = null;
  const fetchErrors: string[] = [];

  // Fetch each source independently so one failure doesn't block the others
  await Promise.allSettled([
    fetchAllEpics().then((r) => { epics = r; }).catch((e) => { fetchErrors.push(`epics: ${e?.message ?? e}`); }),
    fetchActiveSprintIssues().then((r) => { activeStories = r; }).catch((e) => { fetchErrors.push(`activeSprints: ${e?.message ?? e}`); }),
    fetchNextSprintIssues().then((r) => { nextStories = r; }).catch((e) => { fetchErrors.push(`nextSprints: ${e?.message ?? e}`); }),
    fetchAtlasGoals().then((r) => { atlasGoals = r; }).catch((e) => { fetchErrors.push(`atlasGoals: ${e?.message ?? e}`); }),
  ]);

  const data = transformToRoadmap(epics, activeStories, nextStories);
  return NextResponse.json({
    ...data,
    atlasGoals: atlasGoals ?? [],
    ...(fetchErrors.length > 0 ? { fetchErrors } : {}),
  });
}
