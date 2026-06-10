import type { JiraIssue, AdfNode } from "./jira";
import type {
  RoadmapData,
  RoadmapEpic,
  RoadmapStatus,
  Squad,
  CycleSprint,
  Goal,
  GoalRef,
  GoalCoverage,
  OKRSummary,
  SprintInfo,
  SquadStats,
} from "@/types";

// ─── Cycle 2 definition ─────────────────────────────────────────────────────
// Sprints run Mon→Fri×2 weeks (business days only, no weekends)
// Each sprint: start on Monday, end on Friday 11 calendar days later
// Next sprint starts 14 calendar days after the previous start
// Sprint 1: 27 Apr → 08 May | Sprint 2: 11 May → 22 May | Sprint 3: 25 May → 05 Jun ...
const CYCLE_START = new Date("2026-04-27"); // Monday
const CYCLE_NUMBER = 2;
const SPRINT_CALENDAR_DURATION = 11; // Mon to Fri (inclusive) = 11 calendar days
const SPRINT_INTERVAL = 14;          // calendar days between sprint starts
const TOTAL_SPRINTS = 8;

export const CYCLE_SPRINTS: CycleSprint[] = Array.from({ length: TOTAL_SPRINTS }, (_, i) => {
  const start = new Date(CYCLE_START);
  start.setDate(start.getDate() + i * SPRINT_INTERVAL);
  const end = new Date(start);
  end.setDate(end.getDate() + SPRINT_CALENDAR_DURATION);

  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");

  const today = new Date();
  return {
    number: i + 1,
    label: `Sprint ${i + 1}`,
    range: `${fmt(start)} – ${fmt(end)}`,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    isCurrent: today >= start && today <= end,
    isPast: today > end,
  };
});

export function currentSprintNumber(): number {
  return CYCLE_SPRINTS.find((s) => s.isCurrent)?.number ?? 3;
}

// ─── Goal (OKR) status metadata ──────────────────────────────────────────────
// Status do Atlassian Goals. Cores alinhadas à convenção do próprio Atlas.
export const GOAL_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  on_track: { label: "No prazo", color: "#059669", bg: "#d1fae5" },
  at_risk: { label: "Em risco", color: "#d97706", bg: "#fef3c7" },
  off_track: { label: "Atrasado", color: "#dc2626", bg: "#fee2e2" },
  pending: { label: "Não iniciado", color: "#64748b", bg: "#f1f5f9" },
  paused: { label: "Pausado", color: "#64748b", bg: "#f1f5f9" },
  done: { label: "Concluído", color: "#2563eb", bg: "#dbeafe" },
  cancelled: { label: "Cancelado", color: "#94a3b8", bg: "#f1f5f9" },
  unknown: { label: "—", color: "#94a3b8", bg: "#f1f5f9" },
};

export function goalStatusMeta(status: string) {
  return GOAL_STATUS_META[status] ?? GOAL_STATUS_META.unknown;
}

// ─── Squad metadata ─────────────────────────────────────────────────────────
export const SQUAD_META: Record<Squad, { color: string; bg: string }> = {
  "Jornada do Paciente": { color: "#2563eb", bg: "#eff6ff" },
  "Jornada do Parceiro": { color: "#059669", bg: "#ecfdf5" },
  "Jornada do Profissional": { color: "#7c3aed", bg: "#f5f3ff" },
  "HR Experience": { color: "#d97706", bg: "#fffbeb" },
  Outros: { color: "#64748b", bg: "#f8fafc" },
};

// ─── Status colours ─────────────────────────────────────────────────────────
export const STATUS_META: Record<RoadmapStatus, { label: string; color: string; bg: string }> = {
  done: { label: "Finalizado", color: "#059669", bg: "#d1fae5" },
  in_test: { label: "Homologação", color: "#d97706", bg: "#fef3c7" },
  current: { label: "Sprint Atual", color: "#2563eb", bg: "#dbeafe" },
  next: { label: "Próximo Sprint", color: "#7c3aed", bg: "#ede9fe" },
  backlog: { label: "Backlog / Discovery", color: "#64748b", bg: "#f1f5f9" },
};

// ─── Status sort order (done first) ─────────────────────────────────────────
const STATUS_ORDER: Record<RoadmapStatus, number> = {
  done: 0,
  in_test: 1,
  current: 2,
  next: 3,
  backlog: 4,
};

// ─── ADF text extractor ─────────────────────────────────────────────────────
function adfToText(node: AdfNode | null | undefined): string {
  if (!node) return "";
  if (node.text) return node.text;
  if (!node.content) return "";
  return node.content.map(adfToText).join(" ");
}

function extractSection(doc: AdfNode | null | undefined, heading: string): string {
  if (!doc?.content) return "";
  const nodes = doc.content;
  let capturing = false;
  const parts: string[] = [];
  for (const node of nodes) {
    if (node.type === "heading") {
      const text = adfToText(node).toLowerCase();
      if (text.includes(heading.toLowerCase())) {
        capturing = true;
        continue;
      } else if (capturing) {
        break;
      }
    }
    if (capturing) parts.push(adfToText(node));
  }
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 400);
}

// ─── Parsers ─────────────────────────────────────────────────────────────────
function cleanSummary(summary: string): string {
  return summary.replace(/\[KR\d+\]\s*/gi, "").replace(/^[\p{Emoji}\s]+/u, "").trim();
}

// ─── Squad via campo Team (customfield_10001) ────────────────────────────────
// O Team no Jira vem como "Squad <Nome da Jornada>" (ex.: "Squad HR Experience").
// Normalizamos removendo o prefixo "Squad " e casando, sem diferenciar maiúsculas,
// contra as squads conhecidas. Retorna null quando o Team está vazio ou não mapeia
// para nenhuma squad conhecida — esses épicos são ocultados.
const KNOWN_SQUADS = (Object.keys(SQUAD_META) as Squad[]).filter((s) => s !== "Outros");

function teamToSquad(team: { name?: string; title?: string } | null | undefined): Squad | null {
  const raw = (team?.name ?? team?.title ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replace(/^squad\s+/i, "").trim().toLowerCase();
  return KNOWN_SQUADS.find((s) => s.toLowerCase() === normalized) ?? null;
}

// Classificação dirigida pela SPRINT (não mais por palavras-chave do status):
// estados terminais (finalizado/homologando) têm prioridade; depois, sprint
// ativa → "atual", sprint futura → "próximo".
// Também: se a startDate do épico cai dentro da próxima sprint do ciclo,
// o status recebe "next" mesmo que o épico não esteja vinculado à sprint.
function epicRoadmapStatus(
  jiraStatus: string,
  isInActiveSprint: boolean,
  isInNextSprint: boolean,
  startDate?: string
): RoadmapStatus {
  const s = jiraStatus.toUpperCase();
  if (s === "FINALIZADO" || s === "DONE") return "done";
  if (s === "HOMOLOGANDO") return "in_test";
  if (isInActiveSprint) return "current";
  if (isInNextSprint) return "next";
  if (startDate) {
    const today = new Date().toISOString().slice(0, 10);
    const nextSprint = CYCLE_SPRINTS.find((sp) => sp.startDate > today);
    if (nextSprint && startDate >= nextSprint.startDate && startDate <= nextSprint.endDate) {
      return "next";
    }
  }
  return "backlog";
}

// ─── Janela de trabalho do épico (datas reais) ───────────────────────────────
// Híbrido: usa Start date / Due date do épico quando preenchidos; para cada
// extremo que faltar, cai para o span das sprints (min início / max fim de todas
// as sprints do épico). Isso resolve épicos que passam por mais de uma sprint
// (não precisamos escolher uma) e nunca fica vazio, pois a sprint ativa sempre
// tem datas.
function toISODate(d: string | null | undefined): string | null {
  if (!d) return null;
  return d.slice(0, 10); // normaliza datetime → yyyy-mm-dd
}

// Próxima sprint do ciclo (datas do ciclo), usada como fallback de posição para
// épicos de sprint futura que não têm datas próprias nem Start/Due preenchidos.
function nextCycleWindow(): { start: string; end: string } {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming =
    CYCLE_SPRINTS.find((s) => s.startDate > today) ??
    CYCLE_SPRINTS.find((s) => s.isCurrent) ??
    CYCLE_SPRINTS[CYCLE_SPRINTS.length - 1];
  return { start: upcoming.startDate, end: upcoming.endDate };
}

function epicWindow(epic: JiraIssue): {
  startDate: string;
  endDate: string;
  dateSource: "epic" | "sprint" | "mixed";
  sprints: SprintInfo[];
} {
  const sprints: SprintInfo[] = (epic.fields.customfield_10020 ?? []).map((s) => ({
    name: s.name,
    state: s.state,
    startDate: toISODate(s.startDate),
    endDate: toISODate(s.endDate),
  }));

  const sprintStarts = sprints.map((s) => s.startDate).filter((d): d is string => !!d).sort();
  const sprintEnds = sprints.map((s) => s.endDate).filter((d): d is string => !!d).sort();
  const sprintStart = sprintStarts[0] ?? null;
  const sprintEnd = sprintEnds[sprintEnds.length - 1] ?? null;

  const explicitStart = toISODate(epic.fields.customfield_10015);
  const explicitEnd = toISODate(epic.fields.duedate);

  // Híbrido: Start/Due do épico (quando existem) → datas da sprint → próxima
  // sprint do ciclo (fallback para sprints futuras sem data definida).
  const start = explicitStart ?? sprintStart;
  const end = explicitEnd ?? sprintEnd;

  // Procedência por extremo, para transparência no card.
  let dateSource: "epic" | "sprint" | "mixed";
  if (explicitStart && explicitEnd) dateSource = "epic";
  else if (!explicitStart && !explicitEnd) dateSource = "sprint";
  else dateSource = "mixed";

  // Fallback final: se ainda faltar algum extremo (ex.: sprint futura sem data
  // e sem Start/Due), usa a próxima sprint do ciclo.
  const fb = nextCycleWindow();
  const safeStart = start ?? end ?? fb.start;
  let safeEnd = end ?? start ?? fb.end;
  if (safeStart && safeEnd && safeEnd < safeStart) safeEnd = safeStart;

  return { startDate: safeStart, endDate: safeEnd, dateSource, sprints };
}

// ─── Main transform ──────────────────────────────────────────────────────────
export function transformToRoadmap(epics: JiraIssue[], goals: Goal[]): RoadmapData {
  const curSprint = currentSprintNumber();

  // Índice de Goals por ARI, para ligar cada épico ao(s) seu(s) OKR(s).
  const goalsById = new Map(goals.map((g) => [g.id, g]));

  const roadmapEpics: RoadmapEpic[] = epics
    .map((epic): RoadmapEpic | null => {
      // ── Filtro de inclusão ───────────────────────────────────────────────
      // Regra: Team válido E sprint ativa OU futura no próprio épico.
      const squad = teamToSquad(epic.fields.customfield_10001);
      const epicSprints = epic.fields.customfield_10020 ?? [];
      const hasActiveSprint = epicSprints.some((s) => s.state === "active");
      const hasFutureSprint = epicSprints.some((s) => s.state === "future");
      if (!squad || (!hasActiveSprint && !hasFutureSprint)) return null;

      const jiraStatus = epic.fields.status.name;
      const { startDate, endDate, dateSource, sprints } = epicWindow(epic);
      // Classificação dirigida pela sprint: ativa → atual; só futura → próximo.
      // Também verifica se a startDate cai na próxima sprint do ciclo.
      const isActive = hasActiveSprint;
      const isNext = !hasActiveSprint && hasFutureSprint;
      const roadmapStatus = epicRoadmapStatus(jiraStatus, isActive, isNext, startDate);
      const desc = epic.fields.description;

      // OKRs reais vinculados via campo Goals (customfield_10049 → ARIs).
      const epicGoals: GoalRef[] = (epic.fields.customfield_10049 ?? [])
        .map((ref) => {
          const g = goalsById.get(ref.id);
          return g
            ? { id: g.id, key: g.key, name: g.name }
            : { id: ref.id, key: "—", name: "Goal vinculado (não resolvido)" };
        });

      const objective = extractSection(desc, "Key Result") || extractSection(desc, "Meta");
      const productThesis = extractSection(desc, "Por que importa") || extractSection(desc, "Objetivo");

      return {
        key: epic.key,
        summary: epic.fields.summary,
        cleanSummary: cleanSummary(epic.fields.summary),
        status: jiraStatus,
        roadmapStatus,
        squad,
        goals: epicGoals,
        hasGoal: epicGoals.length > 0,
        objective: objective.slice(0, 300),
        productThesis: productThesis.slice(0, 300),
        startDate,
        endDate,
        dateSource,
        sprints,
        jiraUrl: `https://starbemapp.atlassian.net/browse/${epic.key}`,
        priority: epic.fields.priority?.name ?? "Medium",
      };
    })
    .filter((e): e is RoadmapEpic => e !== null);

  // Sort: done first within each squad group
  roadmapEpics.sort((a, b) => {
    if (a.squad !== b.squad) return 0; // preserve squad grouping (done in component)
    return STATUS_ORDER[a.roadmapStatus] - STATUS_ORDER[b.roadmapStatus];
  });

  // ── Cobertura Épicos × OKRs ──────────────────────────────────────────────
  // Para cada Goal, quais épicos do roadmap contribuem para ele.
  const byGoal: GoalCoverage[] = goals
    .map((goal) => ({
      goal,
      epics: roadmapEpics.filter((e) => e.goals.some((g) => g.id === goal.id)),
    }))
    .filter((gc) => gc.epics.length > 0)
    .sort((a, b) => b.epics.length - a.epics.length);

  const linkedGoalIds = new Set(byGoal.map((gc) => gc.goal.id));
  const unlinkedGoals = goals.filter((g) => !linkedGoalIds.has(g.id));

  const withGoal = roadmapEpics.filter((e) => e.hasGoal).length;
  const totalEpicsForOkr = roadmapEpics.length;

  const okr: OKRSummary = {
    totalEpics: totalEpicsForOkr,
    withGoal,
    withoutGoal: totalEpicsForOkr - withGoal,
    coveragePct: totalEpicsForOkr > 0 ? Math.round((withGoal / totalEpicsForOkr) * 100) : 0,
    bySquad: (Object.keys(SQUAD_META) as Squad[])
      .map((squad) => {
        const eps = roadmapEpics.filter((e) => e.squad === squad);
        const wg = eps.filter((e) => e.hasGoal).length;
        return {
          squad,
          total: eps.length,
          withGoal: wg,
          pct: eps.length > 0 ? Math.round((wg / eps.length) * 100) : 0,
        };
      })
      .filter((s) => s.total > 0),
    byGoal,
    unlinkedGoals,
    epicsWithoutGoal: roadmapEpics.filter((e) => !e.hasGoal),
  };

  // Squad stats
  const squadStats: SquadStats[] = (Object.keys(SQUAD_META) as Squad[]).map((squad) => {
    const epicsForSquad = roadmapEpics.filter((e) => e.squad === squad);
    return {
      squad,
      color: SQUAD_META[squad].color,
      total: epicsForSquad.length,
      done: epicsForSquad.filter((e) => e.roadmapStatus === "done").length,
      inTest: epicsForSquad.filter((e) => e.roadmapStatus === "in_test").length,
      current: epicsForSquad.filter((e) => e.roadmapStatus === "current").length,
      next: epicsForSquad.filter((e) => e.roadmapStatus === "next").length,
      backlog: epicsForSquad.filter((e) => e.roadmapStatus === "backlog").length,
      withGoal: epicsForSquad.filter((e) => e.hasGoal).length,
      currentEpics: epicsForSquad.filter((e) =>
        ["current", "in_test"].includes(e.roadmapStatus)
      ),
    };
  });

  const total = roadmapEpics.length;
  return {
    cycle: {
      number: CYCLE_NUMBER,
      startDate: CYCLE_START.toISOString().slice(0, 10),
      endDate: new Date("2026-08-14").toISOString().slice(0, 10), // Sprint 8 ends Fri 14 Aug
      sprints: CYCLE_SPRINTS,
      currentSprintNumber: curSprint,
    },
    epics: roadmapEpics,
    goals,
    okr,
    squadStats,
    summary: {
      total,
      done: roadmapEpics.filter((e) => e.roadmapStatus === "done").length,
      inTest: roadmapEpics.filter((e) => e.roadmapStatus === "in_test").length,
      current: roadmapEpics.filter((e) => e.roadmapStatus === "current").length,
      next: roadmapEpics.filter((e) => e.roadmapStatus === "next").length,
      backlog: roadmapEpics.filter((e) => e.roadmapStatus === "backlog").length,
    },
    lastUpdated: new Date().toISOString(),
  };
}
