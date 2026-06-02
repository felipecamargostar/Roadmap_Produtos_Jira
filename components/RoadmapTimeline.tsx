"use client";

import { useState } from "react";
import type { RoadmapData, RoadmapEpic, CycleSprint, Squad } from "@/types";
import { STATUS_META, SQUAD_META, KR_META } from "@/lib/transform";

const STATUS_ORDER: Record<RoadmapEpic["roadmapStatus"], number> = {
  done: 0, in_test: 1, current: 2, next: 3, backlog: 4,
};

interface Props {
  data: RoadmapData;
}

const SQUADS: Squad[] = [
  "Jornada do Paciente",
  "Jornada do Parceiro",
  "Jornada do Profissional",
  "HR Experience",
  "Outros",
];

function StatusPill({ status }: { status: RoadmapEpic["roadmapStatus"] }) {
  const m = STATUS_META[status];
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ color: m.color, background: m.bg }}
    >
      {m.label}
    </span>
  );
}

function EpicCard({
  epic,
  colSpan,
  onClick,
}: {
  epic: RoadmapEpic;
  colSpan: number;
  onClick: () => void;
}) {
  const m = STATUS_META[epic.roadmapStatus];
  const kr = KR_META[epic.kr];

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border px-2.5 py-1.5 text-xs shadow-sm transition hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
      style={{ borderColor: m.color + "55", background: m.bg }}
      title={epic.cleanSummary}
    >
      <div className="flex items-center gap-1 flex-wrap">
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: kr.color + "20", color: kr.color }}
        >
          {epic.kr}
        </span>
        <span className="font-medium text-gray-800 line-clamp-2 flex-1">
          {epic.cleanSummary}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1">
        <span className="text-gray-400 font-mono">{epic.key}</span>
      </div>
    </button>
  );
}

function DetailModal({ epic, onClose }: { epic: RoadmapEpic; onClose: () => void }) {
  const kr = KR_META[epic.kr];
  const status = STATUS_META[epic.roadmapStatus];
  const squad = SQUAD_META[epic.squad];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: kr.color + "20", color: kr.color }}
              >
                {epic.kr}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: status.bg, color: status.color }}
              >
                {status.label}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: squad.bg, color: squad.color }}
              >
                {epic.squad}
              </span>
            </div>
            <h2 className="text-base font-semibold text-gray-900">{epic.cleanSummary}</h2>
            <a
              href={epic.jiraUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-500 hover:underline font-mono"
            >
              {epic.key}
            </a>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>

        {epic.objective && (
          <div className="mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              OKR / Meta
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">{epic.objective}</p>
          </div>
        )}

        {epic.productThesis && (
          <div className="mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Tese de Produto
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">{epic.productThesis}</p>
          </div>
        )}

        <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
          <span className="text-xs text-gray-500">
            Sprints {epic.sprintStart}–{epic.sprintEnd} do Ciclo {2}
          </span>
          <a
            href={epic.jiraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 transition"
          >
            Abrir no Jira
          </a>
        </div>
      </div>
    </div>
  );
}

export default function RoadmapTimeline({ data }: Props) {
  const [selected, setSelected] = useState<RoadmapEpic | null>(null);
  const [collapsed, setCollapsed] = useState<Set<Squad>>(new Set());
  const [filterKR, setFilterKR] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSquad, setFilterSquad] = useState<string>("all");

  const { cycle, epics } = data;
  const sprints = cycle.sprints;

  function toggleSquad(squad: Squad) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(squad) ? next.delete(squad) : next.add(squad);
      return next;
    });
  }

  const filtered = epics.filter((e) => {
    if (filterKR !== "all" && e.kr !== filterKR) return false;
    if (filterStatus !== "all" && e.roadmapStatus !== filterStatus) return false;
    if (filterSquad !== "all" && e.squad !== filterSquad) return false;
    return true;
  });

  const bySquad = SQUADS.reduce<Record<Squad, RoadmapEpic[]>>((acc, squad) => {
    acc[squad] = filtered
      .filter((e) => e.squad === squad)
      .sort((a, b) => STATUS_ORDER[a.roadmapStatus] - STATUS_ORDER[b.roadmapStatus]);
    return acc;
  }, {} as Record<Squad, RoadmapEpic[]>);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div>
          <label className="text-xs text-gray-500 mr-1">OKR</label>
          <select
            value={filterKR}
            onChange={(e) => setFilterKR(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">Todos os OKRs</option>
            {Object.entries(KR_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mr-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">Todos os Status</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mr-1">Squad</label>
          <select
            value={filterSquad}
            onChange={(e) => setFilterSquad(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">Todos os Squads</option>
            {SQUADS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-xs text-gray-400 self-center">
          {filtered.length} épicos
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(STATUS_META).map(([k, v]) => (
          <span
            key={k}
            className="flex items-center gap-1.5 text-xs"
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: v.color }}
            />
            {v.label}
          </span>
        ))}
      </div>

      {/* Timeline grid */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div
          className="grid bg-gray-50 border-b border-gray-200"
          style={{ gridTemplateColumns: `240px repeat(${sprints.length}, minmax(110px, 1fr))` }}
        >
          <div className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Épico
          </div>
          {sprints.map((s: CycleSprint) => (
            <div
              key={s.number}
              className={`px-2 py-3 text-center border-l border-gray-200 ${
                s.isCurrent ? "bg-brand-50" : ""
              }`}
            >
              <div
                className={`text-xs font-semibold ${
                  s.isCurrent ? "text-brand-600" : "text-gray-600"
                }`}
              >
                {s.label}
                {s.isCurrent && (
                  <span className="ml-1 text-[10px] bg-brand-500 text-white px-1.5 py-0.5 rounded-full">
                    atual
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">{s.range}</div>
            </div>
          ))}
        </div>

        {/* Rows per squad */}
        {SQUADS.map((squad) => {
          const squadEpics = bySquad[squad];
          if (squadEpics.length === 0) return null;
          const m = SQUAD_META[squad];
          const isCollapsed = collapsed.has(squad);

          return (
            <div key={squad}>
              {/* Squad header */}
              <button
                onClick={() => toggleSquad(squad)}
                className="w-full text-left flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition"
                style={{ background: m.bg }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: m.color }}
                />
                <span className="text-sm font-semibold" style={{ color: m.color }}>
                  {squad}
                </span>
                <span
                  className="ml-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: m.color + "20", color: m.color }}
                >
                  {squadEpics.length}
                </span>
                <span className="ml-auto text-gray-400 text-xs">
                  {isCollapsed ? "▶ Expandir" : "▼ Recolher"}
                </span>
              </button>

              {/* Epic rows */}
              {!isCollapsed &&
                squadEpics.map((epic) => (
                  <div
                    key={epic.key}
                    className="grid border-b border-gray-50 hover:bg-gray-50/50 transition"
                    style={{
                      gridTemplateColumns: `240px repeat(${sprints.length}, minmax(110px, 1fr))`,
                    }}
                  >
                    {/* Epic label column */}
                    <div className="px-3 py-2 flex items-start gap-2 border-r border-gray-100">
                      <div className="min-w-0">
                        <StatusPill status={epic.roadmapStatus} />
                        <p
                          className="mt-0.5 text-xs text-gray-700 font-medium line-clamp-2 cursor-pointer hover:text-brand-600"
                          onClick={() => setSelected(epic)}
                          title={epic.cleanSummary}
                        >
                          {epic.cleanSummary}
                        </p>
                      </div>
                    </div>

                    {/* Sprint columns */}
                    {sprints.map((s: CycleSprint) => {
                      const active =
                        s.number >= epic.sprintStart && s.number <= epic.sprintEnd;
                      const isStart = s.number === epic.sprintStart;
                      const isEnd = s.number === epic.sprintEnd;
                      const m = STATUS_META[epic.roadmapStatus];

                      return (
                        <div
                          key={s.number}
                          className={`px-1 py-2 border-l border-gray-100 flex items-center ${
                            s.isCurrent ? "bg-brand-50/30" : ""
                          }`}
                        >
                          {active && (
                            <div
                              className={`w-full h-6 flex items-center cursor-pointer transition hover:opacity-80 ${
                                isStart ? "rounded-l-full pl-2" : ""
                              } ${isEnd ? "rounded-r-full pr-2" : ""} ${
                                !isStart && !isEnd ? "" : ""
                              }`}
                              style={{ background: m.color }}
                              onClick={() => setSelected(epic)}
                              title={epic.cleanSummary}
                            >
                              {isStart && (
                                <span className="text-[10px] text-white font-medium truncate px-1">
                                  {epic.kr !== "Sem OKR" ? epic.kr : ""}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      {selected && (
        <DetailModal epic={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
