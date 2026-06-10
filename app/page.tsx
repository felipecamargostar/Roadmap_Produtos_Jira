"use client";

import { useEffect, useState } from "react";
import type { RoadmapData } from "@/types";
import RoadmapTimeline from "@/components/RoadmapTimeline";
import OKRDashboard from "@/components/OKRDashboard";
import SquadDashboard from "@/components/SquadDashboard";

type Tab = "roadmap" | "okrs" | "squads";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "roadmap", label: "Roadmap", icon: "◈" },
  { id: "okrs", label: "OKRs", icon: "◎" },
  { id: "squads", label: "Squads", icon: "⬡" },
];

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400">Carregando dados do Jira…</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="text-4xl">⚠</div>
      <p className="text-sm text-gray-600 max-w-sm text-center">{message}</p>
      <button
        onClick={onRetry}
        className="text-sm bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600 transition"
      >
        Tentar novamente
      </button>
    </div>
  );
}

function Header({
  data,
  onRefresh,
  refreshing,
}: {
  data: RoadmapData;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const curSprint = data.cycle.sprints.find((s) => s.isCurrent);
  const { summary } = data;

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-5 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <span className="text-white font-bold text-xs">SB</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">
                Product Roadmap
              </h1>
              <p className="text-[10px] text-gray-400 leading-tight">
                Ciclo {data.cycle.number} · {fmtDate(data.cycle.startDate)} → {fmtDate(data.cycle.endDate)}
              </p>
            </div>
          </div>

          {/* Current sprint badge */}
          {curSprint && (
            <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-brand-700">
                Sprint {curSprint.number} atual · {curSprint.range}
              </span>
            </div>
          )}

          {/* Summary pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: "Done", value: summary.done, color: "#059669", bg: "#d1fae5" },
              { label: "Em teste", value: summary.inTest, color: "#d97706", bg: "#fef3c7" },
              { label: "Em dev", value: summary.current, color: "#2563eb", bg: "#dbeafe" },
              { label: "Próximo", value: summary.next, color: "#7c3aed", bg: "#ede9fe" },
              { label: "Backlog", value: summary.backlog, color: "#64748b", bg: "#f1f5f9" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: item.bg, color: item.color }}
              >
                {item.value} {item.label}
              </div>
            ))}
          </div>

          {/* Last updated + refresh */}
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-gray-400 hidden md:block">
              Atualizado{" "}
              {new Date(data.lastUpdated).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              title="Buscar dados frescos do Jira agora"
              className="flex items-center gap-1.5 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white hover:bg-gray-50 disabled:opacity-50 transition"
            >
              <span className={refreshing ? "animate-spin" : ""}>↻</span>
              {refreshing ? "Atualizando…" : "Atualizar"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("roadmap");
  const [data, setData] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(fresh = false) {
    if (fresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/roadmap${fresh ? "?refresh=1" : ""}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {data && <Header data={data} onRefresh={() => load(true)} refreshing={refreshing} />}

      {/* Tab navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-[60px] z-10">
        <div className="max-w-screen-2xl mx-auto px-5">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  tab === t.id
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-5 py-6">
        {loading && <Spinner />}
        {error && <ErrorState message={error} onRetry={load} />}
        {data && !loading && (
          <>
            {tab === "roadmap" && <RoadmapTimeline data={data} />}
            {tab === "okrs" && <OKRDashboard data={data} />}
            {tab === "squads" && <SquadDashboard data={data} />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-3 text-center text-[10px] text-gray-400">
        Starbem Product Roadmap · Dados sincronizados via Jira ·{" "}
        {data && `${data.summary.total} épicos · Ciclo ${data.cycle.number}`}
      </footer>
    </div>
  );
}
