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

// ─── Calendario de ciclos e sprints ──────────────────────────────────────────
// Sprints de duas semanas uteis: comecam na segunda e terminam na sexta 11 dias
// corridos depois; a seguinte comeca 14 dias apos o inicio da anterior. Um ciclo
// tem 8 sprints (112 dias corridos) e os ciclos se sucedem sem intervalo.
//
// O ciclo exibido e derivado da data de hoje a partir da ancora abaixo — antes
// o calendario era uma lista fixa de 8 sprints e parava em 14/08/2026. Se o
// calendario oficial mudar (pausa entre ciclos, ciclo de outro tamanho), ajuste
// a ancora e as constantes; o resto acompanha.
const SPRINT_ANCHOR = "2026-04-27";   // segunda-feira — Sprint 1 do Ciclo 2
const ANCHOR_CYCLE_NUMBER = 2;
const SPRINT_CALENDAR_DURATION = 11;  // segunda -> sexta da semana seguinte
const SPRINT_INTERVAL = 14;           // dias corridos entre inicios de sprint
const SPRINTS_PER_CYCLE = 8;
const CYCLE_LENGTH_DAYS = SPRINT_INTERVAL * SPRINTS_PER_CYCLE;
const DAY_MS = 86_400_000;

function isoToMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}
function addDays(iso: string, days: number): string {
  return new Date(isoToMs(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

// Hoje no fuso do servidor, como yyyy-mm-dd. Nao passa por toISOString(), que
// viraria o dia no fim da tarde em fuso brasileiro.
export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function fmtRange(startDate: string, endDate: string): string {
  const fmt = (iso: string) => {
    const [, m, d] = iso.split("-").map(Number);
    return `${String(d).padStart(2, "0")} ${MONTHS_PT[m - 1]}`;
  };
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

function buildSprints(cycleStart: string, today: string): CycleSprint[] {
  return Array.from({ length: SPRINTS_PER_CYCLE }, (_, i) => {
    const startDate = addDays(cycleStart, i * SPRINT_INTERVAL);
    const endDate = addDays(startDate, SPRINT_CALENDAR_DURATION);
    return {
      number: i + 1,
      label: `Sprint ${i + 1}`,
      range: fmtRange(startDate, endDate),
      startDate,
      endDate,
      isCurrent: today >= startDate && today <= endDate,
      isPast: today > endDate,
    };
  });
}

// Ciclo que contem a data informada (ou o ciclo da ancora, se for anterior a ela).
export function resolveCycle(today: string = todayISO()): {
  number: number;
  startDate: string;
  endDate: string;
  sprints: CycleSprint[];
} {
  const elapsed = Math.floor((isoToMs(today) - isoToMs(SPRINT_ANCHOR)) / DAY_MS);
  const index = elapsed < 0 ? 0 : Math.floor(elapsed / CYCLE_LENGTH_DAYS);
  const startDate = addDays(SPRINT_ANCHOR, index * CYCLE_LENGTH_DAYS);
  const sprints = buildSprints(startDate, today);
  return {
    number: ANCHOR_CYCLE_NUMBER + index,
    startDate,
    endDate: sprints[sprints.length - 1].endDate,
    sprints,
  };
}

// Calculado por chamada (e nao uma vez no import) para que um processo de vida
// longa nao sirva um ciclo velho depois da virada do dia.
export function cycleSprints(today: string = todayISO()): CycleSprint[] {
  return resolveCycle(today).sprints;
}

// Sprint corrente. No fim de semana entre duas sprints cai na proxima a comecar
// e, passado o fim do ciclo, na ultima.
export function currentSprintNumber(today: string = todayISO()): number {
  const sprints = cycleSprints(today);
  return (
    sprints.find((s) => s.isCurrent) ??
    sprints.find((s) => s.startDate > today) ??
    sprints[sprints.length - 1]
  ).number;
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
  "HR Experience": { color: "#d97706", bg: "#fffbeb" },
  "Jornada do Parceiro": { color: "#059669", bg: "#ecfdf5" },
  "Jornada do Profissional": { color: "#7c3aed", bg: "#f5f3ff" },
  Outros: { color: "#64748b", bg: "#f8fafc" },
};

// ─── Nome exibido de cada squad ─────────────────────────────────────────────
// A chave continua sendo o valor do campo Team no Jira ("Squad <chave>"); só o
// rótulo na tela muda. "Jornada do Paciente" é apresentada como "HR Experience"
// e a antiga "HR Experience" (board 630) como "HR Foundation".
export const SQUAD_LABELS: Record<Squad, string> = {
  "Jornada do Paciente": "HR Experience",
  "HR Experience": "HR Foundation",
  "Jornada do Parceiro": "Jornada do Parceiro",
  "Jornada do Profissional": "Jornada do Profissional",
  Outros: "Outros",
};

export function squadLabel(squad: Squad): string {
  return SQUAD_LABELS[squad] ?? squad;
}

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
// O Team no Jira vem como "Squad <Nome da Jornada>" (ex.: "Squad Jornada do Parceiro").
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
    const today = todayISO();
    const nextSprint = cycleSprints(today).find((sp) => sp.startDate > today);
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
  const today = todayISO();
  const sprints = cycleSprints(today);
  const upcoming =
    sprints.find((s) => s.startDate > today) ??
    sprints.find((s) => s.isCurrent) ??
    sprints[sprints.length - 1];
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
  const today = todayISO();
  const cycle = resolveCycle(today);
  const curSprint = currentSprintNumber(today);

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
      number: cycle.number,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      sprints: cycle.sprints,
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
