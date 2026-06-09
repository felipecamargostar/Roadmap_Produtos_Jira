"use client";

import { useState } from "react";
import type { RoadmapData, KRStats, Squad } from "@/types";
import { SQUAD_META, STATUS_META } from "@/lib/transform";

interface Props {
  data: RoadmapData;
}

// Simple SVG donut chart
function DonutChart({
  segments,
  size = 140,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <div className="text-sm text-gray-400">Sem dados</div>;

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const innerR = size * 0.22;
  const stroke = r - innerR;

  let cumAngle = -Math.PI / 2;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const angle = (seg.value / total) * 2 * Math.PI;
      const x1 = cx + r * Math.cos(cumAngle);
      const y1 = cy + r * Math.sin(cumAngle);
      cumAngle += angle;
      const x2 = cx + r * Math.cos(cumAngle);
      const y2 = cy + r * Math.sin(cumAngle);
      const largeArc = angle > Math.PI ? 1 : 0;
      return { ...seg, x1, y1, x2, y2, largeArc, angle };
    });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((arc, i) => (
        <path
          key={i}
          d={`M ${cx} ${cy} L ${arc.x1} ${arc.y1} A ${r} ${r} 0 ${arc.largeArc} 1 ${arc.x2} ${arc.y2} Z`}
          fill={arc.color}
          opacity={0.85}
        >
          <title>{arc.label}: {arc.value}</title>
        </path>
      ))}
      <circle cx={cx} cy={cy} r={innerR} fill="white" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="700" fill="#1e293b">
        {total}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" fill="#94a3b8">
        épicos
      </text>
    </svg>
  );
}

// Horizontal bar showing squad distribution within a KR
function SquadBar({ stats, total }: { stats: KRStats; total: number }) {
  const squads = Object.entries(stats.bySquad) as [Squad, number][];
  if (squads.length === 0) return null;

  return (
    <div className="flex h-4 rounded-full overflow-hidden gap-px bg-gray-100">
      {squads.map(([squad, count]) => (
        <div
          key={squad}
          style={{
            width: `${(count / stats.count) * 100}%`,
            background: SQUAD_META[squad]?.color ?? "#94a3b8",
          }}
          title={`${squad}: ${count}`}
        />
      ))}
    </div>
  );
}

function KRCard({ stats, rank }: { stats: KRStats; rank: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Rank */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
          style={{ background: stats.color }}
        >
          {rank}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: stats.color + "20", color: stats.color }}
            >
              {stats.key}
            </span>
            <span className="text-sm font-medium text-gray-800 truncate">
              {stats.label.replace(/^KR\d+\s*·\s*/, "")}
            </span>
          </div>
          <div className="mt-2">
            <SquadBar stats={stats} total={stats.count} />
          </div>
        </div>

        {/* Count */}
        <div className="text-right flex-shrink-0">
          <div
            className="text-2xl font-bold"
            style={{ color: stats.color }}
          >
            {stats.count}
          </div>
          <div className="text-[10px] text-gray-400">épicos</div>
        </div>

        <span className="text-gray-300 text-sm">{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Squad breakdown */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mt-3 mb-2">
            Por Squad
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(stats.bySquad) as [Squad, number][]).map(([squad, count]) => (
              <div
                key={squad}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: SQUAD_META[squad]?.color }}
                  />
                  <span className="text-xs text-gray-700">{squad}</span>
                </div>
                <span
                  className="text-xs font-semibold"
                  style={{ color: SQUAD_META[squad]?.color }}
                >
                  {count}
                </span>
              </div>
            ))}
          </div>

          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mt-3 mb-2">
            Épicos
          </h4>
          <div className="space-y-1">
            {stats.epics.map((epic) => {
              const sm = STATUS_META[epic.roadmapStatus];
              return (
                <div key={epic.key} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: sm.color }}
                  />
                  <a
                    href={epic.jiraUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 font-mono hover:text-brand-500 flex-shrink-0"
                  >
                    {epic.key}
                  </a>
                  <span className="text-gray-700 truncate">{epic.cleanSummary}</span>
                  <span
                    className="ml-auto flex-shrink-0 px-1.5 py-0.5 rounded-full"
                    style={{ background: sm.bg, color: sm.color }}
                  >
                    {sm.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Stacked bar per squad showing OKR distribution
function SquadOKRMatrix({ data }: { data: RoadmapData }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Distribuição de OKRs por Squad
      </h3>
      <div className="space-y-4">
        {data.squadStats
          .filter((s) => s.total > 0)
          .map((stat) => {
            const m = SQUAD_META[stat.squad];
            const byKREntries = Object.entries(stat.byKR) as [string, number][];
            return (
              <div key={stat.squad}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: m.color }}
                    />
                    <span className="text-xs font-medium text-gray-700">{stat.squad}</span>
                  </div>
                  <span className="text-xs text-gray-400">{stat.total} épicos</span>
                </div>
                {/* Stacked bar */}
                <div className="flex h-5 rounded-full overflow-hidden bg-gray-100 gap-px">
                  {byKREntries.map(([kr, count]) => {
                    const { color } = (data.krStats.find((k) => k.key === kr) ?? {
                      color: "#94a3b8",
                    });
                    const pct = (count / stat.total) * 100;
                    return (
                      <div
                        key={kr}
                        style={{ width: `${pct}%`, background: color }}
                        title={`${kr}: ${count} (${pct.toFixed(0)}%)`}
                        className="flex items-center justify-center"
                      >
                        {pct > 12 && (
                          <span className="text-[9px] text-white font-bold">{kr}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Legend for this squad */}
                <div className="flex flex-wrap gap-2 mt-1">
                  {byKREntries.map(([kr, count]) => {
                    const meta = data.krStats.find((k) => k.key === kr);
                    const pct = ((count / stat.total) * 100).toFixed(0);
                    return (
                      <span key={kr} className="text-[10px] text-gray-500">
                        <span style={{ color: meta?.color }}>{kr}</span>{" "}
                        {count} ({pct}%)
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default function OKRDashboard({ data }: Props) {
  const { krStats, summary } = data;

  const sortedKRs = [...krStats].sort((a, b) => b.count - a.count);

  const donutSegments = krStats
    .filter((k) => k.count > 0)
    .map((k) => ({ value: k.count, color: k.color, label: k.label }));

  const completionRate = summary.total > 0
    ? Math.round(((summary.done + summary.inTest) / summary.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top row: donut + summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Donut */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 self-start">
            Concentração por OKR
          </h3>
          <DonutChart segments={donutSegments} size={160} />
          <div className="mt-3 space-y-1 w-full">
            {krStats
              .filter((k) => k.count > 0)
              .map((k) => (
                <div key={k.key} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: k.color }}
                    />
                    <span className="text-gray-600">{k.key}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-gray-800">{k.count}</span>
                    <span className="text-gray-400">
                      ({((k.count / summary.total) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Progress summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Progresso do Ciclo 2</h3>
          <div className="relative flex items-center justify-center mb-4">
            <svg width={100} height={100} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#6366f1"
                strokeWidth="12"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - completionRate / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
              <text x="50" y="45" textAnchor="middle" fontSize="18" fontWeight="700" fill="#1e293b">
                {completionRate}%
              </text>
              <text x="50" y="60" textAnchor="middle" fontSize="8" fill="#94a3b8">
                completo
              </text>
            </svg>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Finalizados", value: summary.done, color: "#059669" },
              { label: "Em Teste", value: summary.inTest, color: "#d97706" },
              { label: "Sprint Atual", value: summary.current, color: "#2563eb" },
              { label: "Próximo Sprint", value: summary.next, color: "#7c3aed" },
              { label: "Backlog", value: summary.backlog, color: "#64748b" },
              { label: "Total", value: summary.total, color: "#1e293b" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-gray-50 rounded-lg p-2 text-center"
              >
                <div
                  className="text-xl font-bold"
                  style={{ color: item.color }}
                >
                  {item.value}
                </div>
                <div className="text-[10px] text-gray-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top OKR highlight */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Ranking de OKRs</h3>
          <div className="space-y-3">
            {sortedKRs
              .filter((k) => k.count > 0)
              .map((k, i) => (
                <div key={k.key} className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ background: k.color }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {k.key}
                      </span>
                      <span className="text-xs font-bold" style={{ color: k.color }}>
                        {k.count}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(k.count / summary.total) * 100}%`,
                          background: k.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Per-OKR percentage charts */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Concentração de Iniciativas por OKR
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {krStats.filter((k) => k.count > 0).map((k) => {
            const pct = summary.total > 0 ? (k.count / summary.total) * 100 : 0;
            const r = 28;
            const circumference = 2 * Math.PI * r;
            const dash = (pct / 100) * circumference;
            return (
              <div
                key={k.key}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col items-center gap-2"
              >
                <svg width={80} height={80} viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
                  <circle
                    cx="40" cy="40" r={r}
                    fill="none"
                    stroke={k.color}
                    strokeWidth="8"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                  />
                  <text x="40" y="36" textAnchor="middle" fontSize="14" fontWeight="700" fill={k.color}>
                    {pct.toFixed(0)}%
                  </text>
                  <text x="40" y="50" textAnchor="middle" fontSize="9" fill="#94a3b8">
                    {k.count} épicos
                  </text>
                </svg>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full text-center"
                  style={{ background: k.color + "20", color: k.color }}
                >
                  {k.key}
                </span>
                <span className="text-[10px] text-gray-500 text-center leading-tight">
                  {k.label.replace(/^KR\d+\s*·\s*/, "")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Squad x OKR matrix */}
      <SquadOKRMatrix data={data} />

      {/* Atlas Goals */}
      {data.atlasGoals && data.atlasGoals.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Goals do Atlassian ({data.atlasGoals.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.atlasGoals.map((goal) => {
              const statusColor =
                goal.status === "ON_TRACK" ? "#059669" :
                goal.status === "AT_RISK" ? "#d97706" :
                goal.status === "DONE" ? "#6366f1" :
                goal.status === "PAUSED" ? "#94a3b8" :
                "#64748b"; // PENDING / default
              const statusLabel =
                goal.status === "ON_TRACK" ? "No prazo" :
                goal.status === "AT_RISK" ? "Em risco" :
                goal.status === "DONE" ? "Concluído" :
                goal.status === "PAUSED" ? "Pausado" :
                "Pendente";
              return (
                <a
                  key={goal.id}
                  href={goal.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-brand-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-medium text-gray-800 leading-snug group-hover:text-brand-600 line-clamp-2">
                      {goal.name}
                    </span>
                    <span
                      className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: statusColor + "20", color: statusColor }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Progresso</span>
                      <span className="font-semibold text-gray-600">{goal.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${goal.progress}%`, background: statusColor }}
                      />
                    </div>
                  </div>
                  {goal.targetDate && (
                    <p className="mt-2 text-[10px] text-gray-400">
                      Meta: {new Date(goal.targetDate).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                    </p>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}
      {data.atlasGoals !== undefined && data.atlasGoals.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          <strong>Atlas Goals não carregados.</strong> A API do Atlas requer OAuth2. Configure a variável{" "}
          <code className="bg-amber-100 px-1 rounded">ATLAS_ACCESS_TOKEN</code> no Vercel ou use o Personal Access Token.
        </div>
      )}

      {/* KR cards */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Detalhamento por OKR
        </h3>
        <div className="space-y-3">
          {sortedKRs
            .filter((k) => k.count > 0)
            .map((kr, i) => (
              <KRCard key={kr.key} stats={kr} rank={i + 1} />
            ))}
        </div>
      </div>
    </div>
  );
}
