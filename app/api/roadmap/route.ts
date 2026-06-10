/**
 * GET /api/roadmap
 *
 * Fetches Cycle 2 epics from Jira in parallel and transforms them into
 * the RoadmapData shape consumed by the frontend.
 *
 * Cache de 60s (revalidate) via Next.js. Use ?refresh=1 para ignorar o cache
 * e buscar dados frescos do Jira (botão "Atualizar agora" no header).
 * Requires env vars: JIRA_EMAIL, JIRA_API_TOKEN (set in Vercel dashboard).
 */
import { NextResponse } from "next/server";
import { fetchAllEpics, fetchAllGoals } from "@/lib/jira";
import { transformToRoadmap } from "@/lib/transform";

export const dynamic = "force-dynamic";
export const revalidate = 60; // 1 minuto

export async function GET(request: Request) {
  const missing = ["JIRA_EMAIL", "JIRA_API_TOKEN"].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing env vars: ${missing.join(", ")}` },
      { status: 500 }
    );
  }

  // ?refresh=1 → ignora o cache de fetch e busca direto do Jira.
  const fresh = new URL(request.url).searchParams.get("refresh") === "1";

  // Busca épicos do ciclo (filtrados por Team + sprint ativa no JQL) e os
  // Goals (OKRs) do workspace em paralelo. Se os Goals falharem, o roadmap
  // ainda é entregue — apenas sem a dimensão de OKRs.
  const [epics, goals] = await Promise.all([
    fetchAllEpics(fresh),
    fetchAllGoals(fresh).catch((e) => {
      console.error("Falha ao buscar Goals do Jira:", e);
      return [];
    }),
  ]);

  const data = transformToRoadmap(epics, goals);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
