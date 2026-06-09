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

  // Fetch epics, sprint stories, and Atlas Goals in parallel
  const [epics, activeStories, nextStories, atlasGoals] = await Promise.all([
    fetchAllEpics(),
    fetchActiveSprintIssues(),
    fetchNextSprintIssues(),
    fetchAtlasGoals(),
  ]);

  const data = transformToRoadmap(epics, activeStories, nextStories);
  // Attach Atlas Goals to the response (null = API unavailable)
  return NextResponse.json({ ...data, atlasGoals: atlasGoals ?? [] });
}
