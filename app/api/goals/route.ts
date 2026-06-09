import { NextResponse } from "next/server";
import { fetchAtlasGoals } from "@/lib/jira";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const goals = await fetchAtlasGoals();
    if (!goals) {
      return NextResponse.json(
        { error: "Atlas Goals API unavailable — no endpoint responded", goals: [] },
        { status: 200 }
      );
    }
    return NextResponse.json({ goals });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, goals: [] }, { status: 200 });
  }
}
