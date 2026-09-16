"use client";

import { useEffect, useState } from "react";
import type { RoadmapData, RoadmapStatus } from "@/types";
import { STATUS_META } from "@/lib/transform";
import RoadmapTimeline from "@/components/RoadmapTimeline";
import OKRDashboard from "@/components/OKRDashboard";
import SquadDashboard from "@/components/SquadDashboard";

type Tab = "roadmap" | "okrs" | "squads";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "roadmap", label: "Roadmap", icon: "◈" },
  { id: "okrs", label: "OKRs", icon: "◎" },
  { id: "squads", label: "Squads", icon: "⬡" },
];

// Pilulas de resumo — rotulos e cores vem do STATUS_META (fonte unica).
const SUMMARY_PILLS: { key: RoadmapStatus; field: keyof RoadmapData["summary"] }[] = [
  { key: "done", field: "done" },
  { key: "in_test", field: "inTest" },
  { key: "current", field: "current" },
  { key: "next", field: "next" },
  { key: "backlog", field: "backlog" },
];

function StarbemStar({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/starbem-star.svg" alt="" aria-hidden="true" className={className} />
  );
}

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-ink-500">Carregando dados do Jira…</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="text-4xl">⚠</div>
      <p className="text-sm text-ink-600 max-w-sm text-center">{message}</p>
      <button
        onClick={onRetry}
        className="text-sm bg-brand-500 text-white px-4 py-2 rounded-full font-medium hover:bg-brand-600 transition"
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
    <div className="bg-white border-b border-ink-200 shadow-header">
      {/* Fio da marca */}
      <div className="h-0.5 w-full bg-gradient-to-r from-brand-500 via-brand-300 to-secondary-500" />
      <div className="max-w-screen-2xl mx-auto px-5 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Marca */}
          <div className="flex items-center gap-2.5">
            <StarbemStar className="w-7 h-7 flex-shrink-0" />
            <div>
              <h1 className="text-sm font-semibold text-ink-900 leading-tight tracking-tight">
                Starbem <span className="text-ink-300 font-light">·</span>{" "}
                <span className="font-medium text-ink-700">Roadmap de produto</span>
              </h1>
              <p className="text-[11px] text-ink-500 leading-tight">
                Ciclo {data.cycle.number} · {fmtDate(data.cycle.startDate)} → {fmtDate(data.cycle.endDate)}
              </p>
            </div>
          </div>

          {/* Sprint atual */}
          {curSprint && (
            <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-brand-700">
                Sprint {curSprint.number} atual · {curSprint.range}
              </span>
            </div>
          )}

          {/* Resumo por status */}
          <div className="flex items-center gap-2 flex-wrap">
            {SUMMARY_PILLS.map(({ key, field }) => {
              const meta = STATUS_META[key];
              return (
                <div
                  key={key}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {summary[field]} {meta.label}
                </div>
              );
            })}
          </div>

          {/* Atualizacao */}
          <div className="flex items-center gap-2">
            <div className="text-[11px] text-ink-500 hidden md:block">
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
              className="flex items-center gap-1.5 text-xs font-medium border border-ink-200 rounded-full px-3 py-1.5 bg-white text-ink-700 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 disabled:opacity-50 transition"
            >
              <span className={refreshing ? "animate-spin" : ""}>↻</span>
              {refreshing ? "Atualizando…" : "Atualizar"}
            </button>
          </div>
        </div>
      </div>
    </div>
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
      {/* Cabecalho + abas num unico bloco fixo: a altura deixa de ser um valor
          fixo em px e o conteudo nunca passa por cima (z-40 acima do conteudo,
          abaixo do modal em z-50). */}
      <div className="sticky top-0 z-40">
        {data && <Header data={data} onRefresh={() => load(true)} refreshing={refreshing} />}

        <div className="bg-white border-b border-ink-200 shadow-header">
          <div className="max-w-screen-2xl mx-auto px-5">
            <div className="flex gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition ${
                    tab === t.id
                      ? "border-brand-500 text-brand-600"
                      : "border-transparent text-ink-500 hover:text-ink-700 hover:border-ink-200"
                  }`}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Conteudo */}
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

      {/* Rodape */}
      <footer className="border-t border-ink-200 bg-white py-3 text-center text-[11px] text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <StarbemStar className="w-3 h-3" />
          Roadmap de produto · dados sincronizados via Jira
          {data && ` · ${data.summary.total} épicos · ciclo ${data.cycle.number}`}
        </span>
      </footer>
    </div>
  );
}
