"use client";

import { useState } from "react";
import type { RoadmapData, RoadmapEpic, Squad, SprintInfo } from "@/types";
import { STATUS_META, SQUAD_META } from "@/lib/transform";

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

const ROW_H = 40;          // altura de cada linha de épico (px)
const LABEL_W = 260;       // largura da coluna de rótulo (px)
const HEADER_H = 76;       // altura do cabeçalho (meses + sprints + hoje)
const DAY = 86400000;
const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// ─── Date helpers (UTC para evitar deslocamento por fuso) ──────────────────────
function dms(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}
function startOfMonth(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}
function nextMonth(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}
function startOfWeek(ms: number): number {
  const d = new Date(ms);
  const diff = (d.getUTCDay() + 6) % 7; // segunda-feira = início
  return ms - diff * DAY;
}
function endOfWeek(ms: number): number {
  return startOfWeek(ms) + 6 * DAY;
}
function fmtDay(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS_PT[d.getUTCMonth()]}`;
}
function fmtShort(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function StatusPill({ status }: { status: RoadmapEpic["roadmapStatus"] }) {
  const m = STATUS_META[status];
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{ color: m.color, background: m.bg }}
    >
      {m.label}
    </span>
  );
}

function DetailModal({ epic, onClose }: { epic: RoadmapEpic; onClose: () => void }) {
  const status = STATUS_META[epic.roadmapStatus];
  const squad = SQUAD_META[epic.squad];
  const sourceLabel =
    epic.dateSource === "epic"
      ? "datas do épico (Start/Due date)"
      : epic.dateSource === "sprint"
      ? "datas da(s) sprint(s)"
      : "Start/Due date + sprints";

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

        {/* Período de trabalho */}
        <div className="mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            Período de trabalho
          </h3>
          {epic.startDate && epic.endDate ? (
            <p className="text-sm text-gray-700">
              {fmtDay(dms(epic.startDate))} → {fmtDay(dms(epic.endDate))}{" "}
              <span className="text-gray-400 text-xs">({sourceLabel})</span>
            </p>
          ) : (
            <p className="text-sm text-amber-600">⚠ Sem datas disponíveis.</p>
          )}
          {epic.sprints.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {epic.sprints.map((s) => (
                <span
                  key={s.name}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    s.state === "active"
                      ? "bg-emerald-50 text-emerald-600"
                      : s.state === "future"
                      ? "bg-violet-50 text-violet-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                  title={s.startDate && s.endDate ? `${fmtDay(dms(s.startDate))}–${fmtDay(dms(s.endDate))}` : ""}
                >
                  {s.state === "active" ? "🟢 " : ""}
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* OKRs vinculados */}
        <div className="mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            OKRs vinculados
          </h3>
          {epic.hasGoal ? (
            <div className="space-y-1">
              {epic.goals.map((g) => (
                <div key={g.id} className="flex items-center gap-1.5 text-sm">
                  <span className="text-[10px] font-mono text-gray-400">{g.key}</span>
                  <span className="text-gray-700">🎯 {g.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-amber-600">⚠ Nenhum OKR vinculado a este épico.</p>
          )}
        </div>

        {epic.objective && (
          <div className="mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Meta (descrição)
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

        <div className="pt-3 border-t border-gray-100 flex justify-end">
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

// Sprints (ativas e futuras) distintas de uma squad, para os chips no cabeçalho.
function sprintChips(
  epics: RoadmapEpic[]
): { name: string; state: string; start: string | null; end: string | null }[] {
  const map = new Map<string, { name: string; state: string; start: string | null; end: string | null }>();
  for (const e of epics) {
    for (const s of e.sprints) {
      if ((s.state === "active" || s.state === "future") && !map.has(s.name)) {
        map.set(s.name, { name: s.name, state: s.state, start: s.startDate, end: s.endDate });
      }
    }
  }
  // ativas primeiro
  return [...map.values()].sort((a, b) => (a.state === "active" ? -1 : 1) - (b.state === "active" ? -1 : 1));
}

function primarySprint(epic: RoadmapEpic): SprintInfo | null {
  return (
    epic.sprints.find((s) => s.state === "active") ??
    epic.sprints.find((s) => s.state === "future") ??
    epic.sprints[0] ??
    null
  );
}

export default function RoadmapTimeline({ data }: Props) {
  const [selected, setSelected] = useState<RoadmapEpic | null>(null);
  const [collapsed, setCollapsed] = useState<Set<Squad>>(new Set());
  const [filterGoal, setFilterGoal] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSquad, setFilterSquad] = useState<string>("all");

  const { cycle, epics } = data;
  const goalOptions = data.okr.byGoal.map((gc) => gc.goal);

  function toggleSquad(squad: Squad) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(squad) ? next.delete(squad) : next.add(squad);
      return next;
    });
  }

  // ── Eixo de tempo: apertado à janela real dos épicos ────────────────────────
  // Cobrir do início da sprint atual (ou do primeiro épico) até o fim da próxima
  // sprint (ou do último épico), com folga de alguns dias. Mantém as barras
  // legíveis em vez de espremidas no ciclo inteiro.
  const now = new Date();
  const todayMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const datedEpics = epics.filter((e) => e.startDate && e.endDate);

  const epStarts = datedEpics.map((e) => dms(e.startDate));
  const epEnds = datedEpics.map((e) => dms(e.endDate));
  const curSprint = cycle.sprints.find((s) => s.isCurrent);
  const nextSprint = cycle.sprints.find((s) => dms(s.startDate) > todayMs);

  const lo = Math.min(
    ...epStarts,
    todayMs,
    curSprint ? dms(curSprint.startDate) : todayMs
  );
  const hi = Math.max(
    ...epEnds,
    todayMs,
    nextSprint ? dms(nextSprint.endDate) : todayMs
  );
  const axisStart = startOfWeek(lo - 3 * DAY);
  const axisEnd = endOfWeek(hi + 3 * DAY);
  const span = Math.max(axisEnd - axisStart, 1);
  const pct = (ms: number) => ((ms - axisStart) / span) * 100;
  const clamp = (p: number) => Math.max(0, Math.min(100, p));
  const todayPct = todayMs >= axisStart && todayMs <= axisEnd ? clamp(pct(todayMs)) : null;

  // Colunas de mês: faixa [startPct, endPct], rótulo alinhado ao início, faixas
  // alternadas para deixar claro onde cada mês começa e termina.
  const monthCols: { label: string; startPct: number; endPct: number; even: boolean }[] = [];
  {
    let i = 0;
    for (let cur = startOfMonth(axisStart); cur <= axisEnd; cur = nextMonth(cur)) {
      const d = new Date(cur);
      monthCols.push({
        label: `${MONTHS_PT[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`,
        startPct: clamp(pct(cur)),
        endPct: clamp(pct(nextMonth(cur))),
        even: i % 2 === 0,
      });
      i++;
    }
  }

  // Sprints do ciclo que aparecem dentro do eixo (régua de sprints no topo)
  const visibleSprints = cycle.sprints
    .filter((s) => dms(s.endDate) >= axisStart && dms(s.startDate) <= axisEnd)
    .map((s) => {
      const l = clamp(pct(dms(s.startDate)));
      const r = clamp(pct(dms(s.endDate)));
      return { s, leftPct: l, widthPct: Math.max(r - l, 1) };
    });

  const minWidth = LABEL_W + Math.max(monthCols.length, 1) * 180;

  const filtered = epics.filter((e) => {
    if (filterGoal === "none" && e.hasGoal) return false;
    if (filterGoal !== "all" && filterGoal !== "none" && !e.goals.some((g) => g.id === filterGoal))
      return false;
    if (filterStatus !== "all" && e.roadmapStatus !== filterStatus) return false;
    if (filterSquad !== "all" && e.squad !== filterSquad) return false;
    return true;
  });

  const bySquad = SQUADS.reduce<Record<Squad, RoadmapEpic[]>>((acc, squad) => {
    acc[squad] = filtered
      .filter((e) => e.squad === squad)
      .sort((a, b) => {
        const so = STATUS_ORDER[a.roadmapStatus] - STATUS_ORDER[b.roadmapStatus];
        return so !== 0 ? so : dms(a.startDate) - dms(b.startDate);
      });
    return acc;
  }, {} as Record<Squad, RoadmapEpic[]>);

  // Fundo de meses (faixas alternadas + divisórias) + linha de hoje —
  // reaproveitado no cabeçalho e em cada linha do corpo.
  function MonthBackground() {
    return (
      <>
        {monthCols.map((mc) => (
          <div
            key={`band-${mc.label}`}
            className="absolute top-0 bottom-0 z-0"
            style={{
              left: `${mc.startPct}%`,
              width: `${mc.endPct - mc.startPct}%`,
              background: mc.even ? "transparent" : "#f1f5f9",
            }}
          />
        ))}
        {monthCols.map((mc, i) =>
          i === 0 ? null : (
            <div
              key={`line-${mc.label}`}
              className="absolute top-0 bottom-0 border-l border-gray-300 z-0"
              style={{ left: `${mc.startPct}%` }}
            />
          )
        )}
        {todayPct !== null && (
          <div
            className="absolute top-0 bottom-0 border-l-2 border-rose-400/70 z-20"
            style={{ left: `${todayPct}%` }}
          />
        )}
      </>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div>
          <label className="text-xs text-gray-500 mr-1">OKR</label>
          <select
            value={filterGoal}
            onChange={(e) => setFilterGoal(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 max-w-[260px]"
          >
            <option value="all">Todos os OKRs</option>
            <option value="none">Sem OKR vinculado</option>
            {goalOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.key} · {g.name}
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
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {Object.entries(STATUS_META).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 text-xs">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: v.color }} />
            {v.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs ml-2">
          <span className="w-0.5 h-3 bg-rose-400" />
          Hoje
        </span>
      </div>

      {/* Timeline */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <div style={{ minWidth }}>
          {/* Cabeçalho: meses + sprints + hoje */}
          <div className="flex bg-gray-50 border-b border-gray-200">
            <div
              className="flex-none px-4 flex items-end pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide"
              style={{ width: LABEL_W, height: HEADER_H }}
            >
              Épico
            </div>
            <div className="relative flex-1" style={{ height: HEADER_H }}>
              {/* faixas alternadas de mês (fundo) */}
              {monthCols.map((mc) => (
                <div
                  key={`hb-${mc.label}`}
                  className="absolute z-0"
                  style={{
                    left: `${mc.startPct}%`,
                    width: `${mc.endPct - mc.startPct}%`,
                    top: 18,
                    bottom: 0,
                    background: mc.even ? "transparent" : "#f1f5f9",
                  }}
                />
              ))}

              {/* divisórias de mês (do rótulo até a base) */}
              {monthCols.map((mc, i) =>
                i === 0 ? null : (
                  <div
                    key={`hg-${mc.label}`}
                    className="absolute border-l border-gray-300 z-0"
                    style={{ left: `${mc.startPct}%`, top: 18, bottom: 0 }}
                  />
                )
              )}

              {/* rótulos de mês alinhados ao início do mês */}
              {monthCols.map((mc) => (
                <div
                  key={mc.label}
                  className="absolute text-[11px] font-semibold text-gray-500 capitalize z-10"
                  style={{ left: `${mc.startPct}%`, top: 22, paddingLeft: 6 }}
                >
                  {mc.label}
                </div>
              ))}

              {/* régua de sprints */}
              {visibleSprints.map(({ s, leftPct, widthPct }) => (
                <div
                  key={s.number}
                  className={`absolute rounded-md border text-center overflow-hidden ${
                    s.isCurrent
                      ? "bg-brand-100 border-brand-300"
                      : s.isPast
                      ? "bg-gray-100 border-gray-200"
                      : "bg-violet-50 border-violet-200"
                  }`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%`, top: 42, height: 28 }}
                  title={`${s.label} · ${fmtDay(dms(s.startDate))} – ${fmtDay(dms(s.endDate))}`}
                >
                  <div
                    className={`text-[10px] font-semibold leading-tight mt-0.5 truncate px-1 ${
                      s.isCurrent ? "text-brand-700" : s.isPast ? "text-gray-500" : "text-violet-700"
                    }`}
                  >
                    {s.label.replace("Sprint ", "S")}
                    {s.isCurrent && " • atual"}
                  </div>
                  <div className="text-[9px] text-gray-400 leading-tight truncate px-1">
                    {fmtShort(dms(s.startDate))}–{fmtShort(dms(s.endDate))}
                  </div>
                </div>
              ))}

              {/* linha + pílula de hoje */}
              {todayPct !== null && (
                <>
                  <div
                    className="absolute border-l-2 border-rose-400/70 z-20"
                    style={{ left: `${todayPct}%`, top: 16, bottom: 0 }}
                  />
                  <div
                    className="absolute z-30"
                    style={{ left: `${todayPct}%`, top: 0, transform: "translateX(-50%)" }}
                  >
                    <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      hoje
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Linhas por squad */}
          {SQUADS.map((squad) => {
            const squadEpics = bySquad[squad];
            if (squadEpics.length === 0) return null;
            const m = SQUAD_META[squad];
            const isCollapsed = collapsed.has(squad);
            const chips = sprintChips(squadEpics);

            return (
              <div key={squad}>
                {/* Cabeçalho da squad com sprints em andamento */}
                <button
                  onClick={() => toggleSquad(squad)}
                  className="w-full text-left flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition"
                  style={{ background: m.bg }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                  <span className="text-sm font-semibold" style={{ color: m.color }}>
                    {squad}
                  </span>
                  <span
                    className="ml-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: m.color + "20", color: m.color }}
                  >
                    {squadEpics.length}
                  </span>
                  {chips.length > 0 && (
                    <span className="ml-2 flex flex-wrap items-center gap-1.5">
                      {chips.map((b) => (
                        <span
                          key={b.name}
                          className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                            b.state === "active"
                              ? "bg-white/70 text-gray-600 border-gray-200"
                              : "bg-violet-50 text-violet-700 border-violet-200"
                          }`}
                        >
                          {b.state === "active" ? "🟢" : "🔜"} {b.name}
                          {b.start && b.end ? ` · ${fmtDay(dms(b.start))}–${fmtDay(dms(b.end))}` : ""}
                        </span>
                      ))}
                    </span>
                  )}
                  <span className="ml-auto text-gray-400 text-xs">
                    {isCollapsed ? "▶ Expandir" : "▼ Recolher"}
                  </span>
                </button>

                {/* Épicos */}
                {!isCollapsed &&
                  squadEpics.map((epic) => {
                    const sm = STATUS_META[epic.roadmapStatus];
                    const hasDates = !!(epic.startDate && epic.endDate);
                    const leftPct = hasDates ? clamp(pct(dms(epic.startDate))) : 0;
                    const rightPct = hasDates ? clamp(pct(dms(epic.endDate))) : 0;
                    const widthPct = Math.max(rightPct - leftPct, 1.5);
                    const ps = primarySprint(epic);

                    return (
                      <div
                        key={epic.key}
                        className="flex border-b border-gray-50 hover:bg-gray-50/40 transition"
                      >
                        {/* Rótulo */}
                        <div
                          className="flex-none px-3 py-2 border-r border-gray-100"
                          style={{ width: LABEL_W }}
                        >
                          <div className="flex items-center gap-1 flex-wrap">
                            <StatusPill status={epic.roadmapStatus} />
                            {epic.hasGoal ? (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium"
                                title={epic.goals.map((g) => `${g.key} · ${g.name}`).join("\n")}
                              >
                                🎯 {epic.goals[0].key}
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">
                                Sem OKR
                              </span>
                            )}
                          </div>
                          <p
                            className="mt-0.5 text-xs text-gray-700 font-medium line-clamp-1 cursor-pointer hover:text-brand-600"
                            onClick={() => setSelected(epic)}
                            title={epic.cleanSummary}
                          >
                            {epic.cleanSummary}
                          </p>
                          <div className="text-[10px] text-gray-400 truncate">
                            {hasDates ? `${fmtDay(dms(epic.startDate))} – ${fmtDay(dms(epic.endDate))}` : "sem datas"}
                            {ps ? ` · ${ps.name}` : ""}
                          </div>
                        </div>

                        {/* Trilha de tempo */}
                        <div className="relative flex-1" style={{ height: ROW_H }}>
                          <MonthBackground />
                          {hasDates && (
                            <button
                              onClick={() => setSelected(epic)}
                              title={`${epic.cleanSummary}\n${fmtDay(dms(epic.startDate))} – ${fmtDay(dms(epic.endDate))}`}
                              className="absolute z-10 rounded-full flex items-center px-2 shadow-sm cursor-pointer transition hover:opacity-90 hover:shadow"
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                                top: "50%",
                                transform: "translateY(-50%)",
                                height: 22,
                                background: sm.color,
                              }}
                            >
                              <span className="text-[10px] text-white font-medium truncate">
                                {epic.cleanSummary}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail modal */}
      {selected && <DetailModal epic={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
