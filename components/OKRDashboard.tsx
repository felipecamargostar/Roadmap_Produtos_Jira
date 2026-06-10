"use client";

import { useState } from "react";
import type { RoadmapData, GoalCoverage, Goal } from "@/types";
import { SQUAD_META, STATUS_META, goalStatusMeta } from "@/lib/transform";

interface Props {
  data: RoadmapData;
}

// Anel de progresso circular reutilizável
function Ring({ pct, color, size = 100 }: { pct: number; color: string; size?: number }) {
  const r = size * 0.4;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={size * 0.12} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={size * 0.12}
        strokeDasharray={`${c}`}
        strokeDashoffset={`${c * (1 - clamped / 100)}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="46%" textAnchor="middle" fontSize={size * 0.2} fontWeight="700" fill="#1e293b">
        {Math.round(pct)}%
      </text>
      <text x="50%" y="62%" textAnchor="middle" fontSize={size * 0.1} fill="#94a3b8">
        com OKR
      </text>
    </svg>
  );
}

function GoalStatusPill({ status }: { status: string }) {
  const m = goalStatusMeta(status);
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
      style={{ color: m.color, background: m.bg }}
    >
      {m.label}
    </span>
  );
}

function GoalProgressBar({ goal }: { goal: Goal }) {
  const m = goalStatusMeta(goal.status);
  const pct = Math.max(0, Math.min(100, goal.progress));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: m.color }} />
      </div>
      <span className="text-[10px] text-gray-500 w-9 text-right">{goal.progress}%</span>
    </div>
  );
}

// Card de um Goal com os épicos que contribuem para ele
function GoalCard({ cov, rank }: { cov: GoalCoverage; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const { goal, epics } = cov;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white bg-brand-500">
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <a
              href={goal.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-mono text-gray-400 hover:text-brand-500"
            >
              {goal.key}
            </a>
            <GoalStatusPill status={goal.status} />
            {goal.isObjective && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                Objetivo
              </span>
            )}
            {goal.targetDate && (
              <span className="text-[10px] text-gray-400">🎯 {goal.targetDate}</span>
            )}
          </div>
          <span className="text-sm font-medium text-gray-800 line-clamp-1">{goal.name}</span>
          <div className="mt-2">
            <GoalProgressBar goal={goal} />
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-brand-600">{epics.length}</div>
          <div className="text-[10px] text-gray-400">épicos</div>
        </div>
        <span className="text-gray-300 text-sm">{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mt-3 mb-2">
            Épicos que contribuem
          </h4>
          <div className="space-y-1">
            {epics.map((epic) => {
              const sm = STATUS_META[epic.roadmapStatus];
              const qm = SQUAD_META[epic.squad];
              return (
                <div key={epic.key} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sm.color }} />
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
                    className="ml-auto flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px]"
                    style={{ background: qm.bg, color: qm.color }}
                  >
                    {epic.squad}
                  </span>
                  <span
                    className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px]"
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

export default function OKRDashboard({ data }: Props) {
  const { okr, summary } = data;
  const hasGoals = data.goals.length > 0;

  if (!hasGoals) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
        <div className="text-3xl mb-2">🎯</div>
        <p className="text-sm text-gray-600">
          Nenhum OKR (Goal) foi carregado do Jira. Verifique a conexão com o Atlassian Goals.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Cobertura Épicos × OKRs ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hero de cobertura */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 self-start">
            Cobertura Épicos × OKRs
          </h3>
          <Ring pct={okr.coveragePct} color="#6366f1" size={140} />
          <p className="text-xs text-gray-500 text-center mt-3">
            <span className="font-bold text-gray-800">{okr.withGoal}</span> de{" "}
            <span className="font-bold text-gray-800">{okr.totalEpics}</span> épicos têm OKR real
            vinculado
          </p>
          <div className="grid grid-cols-2 gap-2 w-full mt-3">
            <div className="bg-emerald-50 rounded-lg p-2 text-center">
              <div className="text-xl font-bold text-emerald-600">{okr.withGoal}</div>
              <div className="text-[10px] text-gray-500">com OKR</div>
            </div>
            <div className="bg-rose-50 rounded-lg p-2 text-center">
              <div className="text-xl font-bold text-rose-600">{okr.withoutGoal}</div>
              <div className="text-[10px] text-gray-500">sem OKR</div>
            </div>
          </div>
        </div>

        {/* Cobertura por squad */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Cobertura por Squad</h3>
          <div className="space-y-3">
            {okr.bySquad.map((s) => {
              const m = SQUAD_META[s.squad];
              return (
                <div key={s.squad}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
                      <span className="text-xs font-medium text-gray-700">{s.squad}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {s.withGoal}/{s.total} ·{" "}
                      <span className="font-semibold" style={{ color: m.color }}>
                        {s.pct}%
                      </span>
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${s.pct}%`, background: m.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-4">
            O percentual indica quantos épicos ativos da squad estão conectados a um OKR real do
            Jira Goals. Quanto maior, melhor o alinhamento estratégico.
          </p>
        </div>
      </div>

      {/* ── Progresso dos OKRs + épicos vinculados ── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          OKRs com iniciativas ({okr.byGoal.length})
        </h3>
        {okr.byGoal.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-sm text-gray-500">
            Nenhum épico ativo está vinculado a um OKR ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {okr.byGoal.map((cov, i) => (
              <GoalCard key={cov.goal.id} cov={cov} rank={i + 1} />
            ))}
          </div>
        )}
      </div>

      {/* ── Épicos sem OKR ── */}
      {okr.epicsWithoutGoal.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Épicos sem OKR vinculado ({okr.epicsWithoutGoal.length})
          </h3>
          <div className="bg-white rounded-xl border border-amber-200 shadow-sm divide-y divide-gray-50">
            {okr.epicsWithoutGoal.map((epic) => {
              const sm = STATUS_META[epic.roadmapStatus];
              const qm = SQUAD_META[epic.squad];
              return (
                <a
                  key={epic.key}
                  href={epic.jiraUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 text-xs hover:bg-amber-50/40 transition"
                >
                  <span className="text-amber-500 flex-shrink-0">⚠</span>
                  <span className="text-gray-500 font-mono flex-shrink-0">{epic.key}</span>
                  <span className="text-gray-700 truncate">{epic.cleanSummary}</span>
                  <span
                    className="ml-auto flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px]"
                    style={{ background: qm.bg, color: qm.color }}
                  >
                    {epic.squad}
                  </span>
                  <span
                    className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px]"
                    style={{ background: sm.bg, color: sm.color }}
                  >
                    {sm.label}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* ── OKRs sem nenhum épico (órfãos) ── */}
      {okr.unlinkedGoals.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            OKRs sem épico vinculado ({okr.unlinkedGoals.length})
          </h3>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-50">
            {okr.unlinkedGoals.map((goal) => (
              <a
                key={goal.id}
                href={goal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-xs hover:bg-gray-50 transition"
              >
                <span className="text-gray-400 font-mono flex-shrink-0">{goal.key}</span>
                <GoalStatusPill status={goal.status} />
                <span className="text-gray-700 truncate">{goal.name}</span>
                {goal.isObjective && (
                  <span className="ml-auto flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                    Objetivo
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Rodapé com nota de contexto do ciclo */}
      <p className="text-[11px] text-gray-400">
        {summary.total} épicos ativos no Ciclo {data.cycle.number} · {data.goals.length} OKRs no
        workspace · dados sincronizados do Jira Goals.
      </p>
    </div>
  );
}
