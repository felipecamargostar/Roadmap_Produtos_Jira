import type { JiraIssue, AdfNode } from "./jira";
import type {
  RoadmapData,
  RoadmapEpic,
  RoadmapStatus,
  Squad,
  KRKey,
  CycleSprint,
  KRStats,
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

// ─── KR metadata ───────────────────────────────────────────────────────────
export const KR_META: Record<KRKey, { label: string; color: string }> = {
  KR1: { label: "KR1 · Ecossistema Conectado", color: "#6366f1" },
  KR2: { label: "KR2 · StarBrain Health Coach", color: "#ec4899" },
  KR3: { label: "KR3 · WhatsApp como canal estratégico", color: "#14b8a6" },
  KR4: { label: "KR4 · NPS ≥ 80 Profissionais", color: "#f97316" },
  KR5: { label: "KR5 · Portal RH Enterprise", color: "#8b5cf6" },
  "Sem OKR": { label: "Sem OKR", color: "#94a3b8" },
};

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
  in_test: { label: "Em Teste", color: "#d97706", bg: "#fef3c7" },
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
function extractKR(summary: string): KRKey {
  const match = summary.match(/\[KR(\d+)\]/i);
  if (match) {
    const n = parseInt(match[1]);
    if (n >= 1 && n <= 5) return `KR${n}` as KRKey;
  }
  return "Sem OKR";
}

function cleanSummary(summary: string): string {
  return summary.replace(/\[KR\d+\]\s*/gi, "").replace(/^[\p{Emoji}\s]+/u, "").trim();
}

// Board ID → Squad mapping (confirmed from Jira)
const BOARD_SQUAD: Record<number, Squad> = {
  628: "Jornada do Paciente",
  629: "Jornada do Profissional",
  630: "HR Experience",
  67: "Jornada do Parceiro",
};

function detectSquad(sprints: { name: string; boardId?: number }[] | null): Squad {
  if (!sprints || sprints.length === 0) return "Outros";
  // Prefer boardId-based detection (most reliable)
  for (const s of sprints) {
    if (s.boardId && BOARD_SQUAD[s.boardId]) return BOARD_SQUAD[s.boardId];
  }
  // Fallback: sprint name regex
  const name = sprints[0].name.toLowerCase();
  if (/paciente|aplicativo/i.test(name)) return "Jornada do Paciente";
  if (/parceiro/i.test(name)) return "Jornada do Parceiro";
  if (/prof(issional)?/i.test(name)) return "Jornada do Profissional";
  if (/hr|experience/i.test(name)) return "HR Experience";
  return "Outros";
}

// For epics with no sprint assignment, infer squad from OKR key
function krToDefaultSquad(kr: KRKey): Squad {
  switch (kr) {
    case "KR5": return "HR Experience";
    case "KR4": return "Jornada do Profissional";
    case "KR3": return "Jornada do Parceiro";
    case "KR1":
    case "KR2":
      return "Jornada do Paciente";
    default:
      return "Outros";
  }
}

function epicRoadmapStatus(
  jiraStatus: string,
  isInActiveSprint: boolean,
  isInNextSprint: boolean
): RoadmapStatus {
  const s = jiraStatus.toUpperCase();
  if (s === "FINALIZADO" || s === "DONE") return "done";
  if (s === "HOMOLOGANDO") return "in_test";
  if (isInActiveSprint || s === "DESENVOLVENDO" || s === "REFINAMENTO") return "current";
  if (isInNextSprint || s === "PROTÓTIPO") return "next";
  return "backlog";
}

function sprintRange(
  status: RoadmapStatus,
  currentSprint: number
): { start: number; end: number } {
  switch (status) {
    case "done":
      return { start: Math.max(1, currentSprint - 1), end: Math.max(1, currentSprint - 1) };
    case "in_test":
      return { start: currentSprint, end: currentSprint };
    case "current":
      return { start: currentSprint, end: Math.min(TOTAL_SPRINTS, currentSprint + 1) };
    case "next":
      return {
        start: Math.min(TOTAL_SPRINTS, currentSprint + 1),
        end: Math.min(TOTAL_SPRINTS, currentSprint + 2),
      };
    case "backlog":
      return {
        start: Math.min(TOTAL_SPRINTS, currentSprint + 2),
        end: Math.min(TOTAL_SPRINTS, currentSprint + 3),
      };
  }
}

// ─── Main transform ──────────────────────────────────────────────────────────
export function transformToRoadmap(
  epics: JiraIssue[],
  activeStories: JiraIssue[],
  nextStories: JiraIssue[]
): RoadmapData {
  const curSprint = currentSprintNumber();

  const activeEpicKeys = new Set(
    activeStories.flatMap((s) => (s.fields.parent ? [s.fields.parent.key] : []))
  );
  const nextEpicKeys = new Set(
    nextStories.flatMap((s) => (s.fields.parent ? [s.fields.parent.key] : []))
  );

  const roadmapEpics: RoadmapEpic[] = epics.map((epic) => {
    const kr = extractKR(epic.fields.summary);
    const jiraStatus = epic.fields.status.name;
    // Use sprint state directly from the epic's own sprint data (most reliable)
    const epicSprints = epic.fields.customfield_10020 ?? [];
    const hasActiveSprint = epicSprints.some((s) => s.state === "active");
    const hasFutureSprint = epicSprints.some((s) => s.state === "future");
    // Also check story-based detection as fallback
    const isActive = hasActiveSprint || activeEpicKeys.has(epic.key);
    const isNext = !isActive && (hasFutureSprint || nextEpicKeys.has(epic.key));
    const roadmapStatus = epicRoadmapStatus(jiraStatus, isActive, isNext);
    const { start, end } = sprintRange(roadmapStatus, curSprint);
    const sprints = epic.fields.customfield_10020;
    const squad = sprints && sprints.length > 0
      ? detectSquad(sprints)
      : krToDefaultSquad(kr);
    const desc = epic.fields.description;

    const objective = extractSection(desc, "Key Result") || extractSection(desc, "Meta");
    const productThesis = extractSection(desc, "Por que importa") || extractSection(desc, "Objetivo");

    return {
      key: epic.key,
      summary: epic.fields.summary,
      cleanSummary: cleanSummary(epic.fields.summary),
      status: jiraStatus,
      roadmapStatus,
      squad,
      kr,
      krTitle: KR_META[kr].label,
      objective: objective.slice(0, 300),
      productThesis: productThesis.slice(0, 300),
      sprintStart: start,
      sprintEnd: end,
      jiraUrl: `https://starbemapp.atlassian.net/browse/${epic.key}`,
      priority: epic.fields.priority?.name ?? "Medium",
    };
  });

  // Sort: done first within each squad group
  roadmapEpics.sort((a, b) => {
    if (a.squad !== b.squad) return 0; // preserve squad grouping (done in component)
    return STATUS_ORDER[a.roadmapStatus] - STATUS_ORDER[b.roadmapStatus];
  });

  // KR stats
  const krStats: KRStats[] = (Object.keys(KR_META) as KRKey[]).map((kr) => {
    const epicsForKR = roadmapEpics.filter((e) => e.kr === kr);
    const bySquad: Partial<Record<Squad, number>> = {};
    for (const e of epicsForKR) {
      bySquad[e.squad] = (bySquad[e.squad] ?? 0) + 1;
    }
    return {
      key: kr,
      label: KR_META[kr].label,
      color: KR_META[kr].color,
      count: epicsForKR.length,
      epics: epicsForKR,
      bySquad,
    };
  });

  // Squad stats
  const squadStats: SquadStats[] = (Object.keys(SQUAD_META) as Squad[]).map((squad) => {
    const epicsForSquad = roadmapEpics.filter((e) => e.squad === squad);
    const byKR: Partial<Record<KRKey, number>> = {};
    for (const e of epicsForSquad) {
      byKR[e.kr] = (byKR[e.kr] ?? 0) + 1;
    }
    return {
      squad,
      color: SQUAD_META[squad].color,
      total: epicsForSquad.length,
      done: epicsForSquad.filter((e) => e.roadmapStatus === "done").length,
      inTest: epicsForSquad.filter((e) => e.roadmapStatus === "in_test").length,
      current: epicsForSquad.filter((e) => e.roadmapStatus === "current").length,
      next: epicsForSquad.filter((e) => e.roadmapStatus === "next").length,
      backlog: epicsForSquad.filter((e) => e.roadmapStatus === "backlog").length,
      byKR,
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
    krStats,
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
