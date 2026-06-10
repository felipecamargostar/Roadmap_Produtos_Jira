"use client";

import type { RoadmapData, SquadStats, RoadmapEpic } from "@/types";
import { SQUAD_META, STATUS_META } from "@/lib/transform";

interface Props {
  data: RoadmapData;
}

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs text-gray-500 w-6 text-right">{value}</span>
    </div>
  );
}

function EpicRow({ epic }: { epic: RoadmapEpic }) {
  const sm = STATUS_META[epic.roadmapStatus];
  return (
    <a
      href={epic.jiraUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition group"
    >
      <span
        className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: sm.color }}
      />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-gray-700 group-hover:text-brand-600 line-clamp-1">
          {epic.cleanSummary}
        </span>
        <span className="text-[10px] text-gray-400 font-mono">{epic.key}</span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {epic.hasGoal ? (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-600"
            title={epic.goals.map((g) => `${g.key} · ${g.name}`).join("\n")}
          >
            🎯 {epic.goals[0].key}
          </span>
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-400">
            Sem OKR
          </span>
        )}
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ background: sm.bg, color: sm.color }}
        >
          {sm.label}
        </span>
      </div>
    </a>
  );
}

function SquadCard({ stats, currentSprint }: { stats: SquadStats; currentSprint: number }) {
  const m = SQUAD_META[stats.squad];
  const pctDone = stats.total > 0
    ? Math.round(((stats.done + stats.inTest) / stats.total) * 100)
    : 0;

  const statusRows = [
    { key: "done", label: "Finalizado", value: stats.done, color: "#059669" },
    { key: "in_test", label: "Em Teste", value: stats.inTest, color: "#d97706" },
    { key: "current", label: "Sprint Atual", value: stats.current, color: "#2563eb" },
    { key: "next", label: "Próximo Sprint", value: stats.next, color: "#7c3aed" },
    { key: "backlog", label: "Backlog", value: stats.backlog, color: "#64748b" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4" style={{ background: m.bg, borderBottom: `2px solid ${m.color}20` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: m.color }} />
            <h3 className="text-sm font-bold" style={{ color: m.color }}>
              {stats.squad}
            </h3>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold" style={{ color: m.color }}>
              {stats.total}
            </span>
            <span className="text-xs text-gray-500 ml-1">épicos</span>
          </div>
        </div>

        {/* Progress ring */}
        <div className="flex items-center gap-3 mt-3">
          <svg width={44} height={44} viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="18" fill="none" stroke="#e2e8f0" strokeWidth="5" />
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              stroke={m.color}
              strokeWidth="5"
              strokeDasharray={`${2 * Math.PI * 18}`}
              strokeDashoffset={`${2 * Math.PI * 18 * (1 - pctDone / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 22 22)"
            />
            <text x="22" y="26" textAnchor="middle" fontSize="10" fontWeight="700" fill={m.color}>
              {pctDone}%
            </text>
          </svg>
          <div className="text-xs text-gray-500">
            {stats.done + stats.inTest} de {stats.total} concluídos ou em teste
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status breakdown */}
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Por Status
          </h4>
          <div className="space-y-1.5">
            {statusRows.map((row) => (
              <div key={row.key}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-gray-600">{row.label}</span>
                </div>
                <ProgressBar value={row.value} total={stats.total} color={row.color} />
              </div>
            ))}
          </div>
        </div>

        {/* Cobertura de OKR */}
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Cobertura de OKR
          </h4>
          {(() => {
            const pctOkr = stats.total > 0 ? Math.round((stats.withGoal / stats.total) * 100) : 0;
            const semOkr = stats.total - stats.withGoal;
            return (
              <div className="space-y-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold" style={{ color: m.color }}>
                    {pctOkr}%
                  </span>
                  <span className="text-xs text-gray-500">dos épicos com OKR</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pctOkr}%`, background: m.color }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-600 font-medium">{stats.withGoal} com OKR</span>
                  <span className="text-gray-400">{semOkr} sem OKR</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Current sprint epics */}
      {stats.currentEpics.length > 0 && (
        <div className="border-t border-gray-100 px-4 pb-4">
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mt-3 mb-2">
            Sprint {currentSprint} — Em andamento
          </h4>
          <div className="space-y-0.5">
            {stats.currentEpics.map((epic) => (
              <EpicRow key={epic.key} epic={epic} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Comparison matrix: all squads side by side
function SquadMatrix({ data }: { data: RoadmapData }) {
  const squads = data.squadStats.filter((s) => s.total > 0);
  const statuses = [
    { key: "done", label: "Done", color: "#059669" },
    { key: "inTest", label: "Em Teste", color: "#d97706" },
    { key: "current", label: "Atual", color: "#2563eb" },
    { key: "next", label: "Próximo", color: "#7c3aed" },
    { key: "backlog", label: "Backlog", color: "#64748b" },
  ] as const;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">Comparativo de Squads</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-4 py-2.5 text-gray-500 font-medium w-48">Squad</th>
              {statuses.map((s) => (
                <th key={s.key} className="text-center px-3 py-2.5 text-gray-500 font-medium">
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-white text-[10px]"
                    style={{ background: s.color }}
                  >
                    {s.label}
                  </span>
                </th>
              ))}
              <th className="text-center px-3 py-2.5 text-gray-500 font-medium">Total</th>
              <th className="text-center px-3 py-2.5 text-gray-500 font-medium">% Concluído</th>
            </tr>
          </thead>
          <tbody>
            {squads.map((stat) => {
              const m = SQUAD_META[stat.squad];
              const pct = stat.total > 0
                ? Math.round(((stat.done + stat.inTest) / stat.total) * 100)
                : 0;
              return (
                <tr key={stat.squad} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                      <span className="font-medium text-gray-700">{stat.squad}</span>
                    </div>
                  </td>
                  <td className="text-center px-3 py-2.5 font-semibold text-emerald-600">{stat.done}</td>
                  <td className="text-center px-3 py-2.5 font-semibold text-amber-600">{stat.inTest}</td>
                  <td className="text-center px-3 py-2.5 font-semibold text-blue-600">{stat.current}</td>
                  <td className="text-center px-3 py-2.5 font-semibold text-violet-600">{stat.next}</td>
                  <td className="text-center px-3 py-2.5 font-semibold text-slate-500">{stat.backlog}</td>
                  <td className="text-center px-3 py-2.5 font-bold text-gray-800">{stat.total}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 justify-center">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: m.color }}
                        />
                      </div>
                      <span style={{ color: m.color }} className="font-semibold">{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SquadDashboard({ data }: Props) {
  const activeSquads = data.squadStats.filter((s) => s.total > 0);

  return (
    <div className="space-y-6">
      <SquadMatrix data={data} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {activeSquads.map((stat) => (
          <SquadCard
            key={stat.squad}
            stats={stat}
            currentSprint={data.cycle.currentSprintNumber}
          />
        ))}
      </div>
    </div>
  );
}
