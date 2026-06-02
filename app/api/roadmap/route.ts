import { NextResponse } from "next/server";
import { fetchAllEpics, fetchActiveSprintIssues, fetchNextSprintIssues } from "@/lib/jira";
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

  const [epics, activeStories, nextStories] = await Promise.all([
    fetchAllEpics(),
    fetchActiveSprintIssues(),
    fetchNextSprintIssues(),
  ]);

  const data = transformToRoadmap(epics, activeStories, nextStories);
  return NextResponse.json(data);
}
