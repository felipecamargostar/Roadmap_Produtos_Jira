/**
 * types/index.ts — Shared TypeScript interfaces for the Starbem Roadmap
 *
 * Squad board IDs (Jira):
 *   628 → Jornada do Paciente
 *   629 → Jornada do Profissional
 *   630 → HR Experience
 *    67 → Jornada do Parceiro
 */

export type Squad =
  | "Jornada do Paciente"
  | "Jornada do Parceiro"
  | "Jornada do Profissional"
  | "HR Experience"
  | "Outros";

export type RoadmapStatus = "done" | "in_test" | "current" | "next" | "backlog";

// ─── OKRs (Atlassian Goals) ──────────────────────────────────────────────────
// Goal completo, vindo do Atlassian Goals (townsquare) via GraphQL.
export interface Goal {
  id: string;               // ARI (ari:cloud:townsquare:<cloud>:goal/<uuid>)
  key: string;              // ex.: KKGORYEI-20
  name: string;
  status: string;           // pending | on_track | at_risk | off_track | done | cancelled | paused | unknown
  progress: number;         // percentual 0–100 (pode vir negativo no townsquare)
  targetDate: string | null;// rótulo legível (ex.: "August")
  parentKey: string | null; // key do goal pai (null = objetivo de topo)
  url: string;
  isObjective: boolean;     // true quando não tem pai (objetivo de topo)
}

// Referência enxuta de um Goal vinculado a um épico.
export interface GoalRef {
  id: string;
  key: string;
  name: string;
}

// Sprint do épico (para rotular barras e detectar sprints em andamento).
export interface SprintInfo {
  name: string;
  state: "active" | "closed" | "future" | string;
  startDate: string | null;
  endDate: string | null;
}

export interface CycleSprint {
  number: number;   // 1-8
  label: string;    // "Sprint 1"
  range: string;    // "01–15 Mai"
  startDate: string; // ISO date
  endDate: string;   // ISO date
  isCurrent: boolean;
  isPast: boolean;
}

export interface RoadmapEpic {
  key: string;
  summary: string;
  cleanSummary: string; // without [KR tag]
  status: string;
  roadmapStatus: RoadmapStatus;
  squad: Squad;
  goals: GoalRef[];   // OKRs reais vinculados (Atlassian Goals)
  hasGoal: boolean;   // true se o épico tem ao menos um Goal vinculado
  objective: string;
  productThesis: string;
  // Janela real de trabalho do épico (ISO yyyy-mm-dd), usada para posicionar a
  // barra na timeline por data. Híbrido: Start/Due date do épico → span das sprints.
  startDate: string;
  endDate: string;
  dateSource: "epic" | "sprint" | "mixed"; // de onde vieram as datas (transparência)
  sprints: SprintInfo[];                    // sprints do épico (rótulos / em andamento)
  jiraUrl: string;
  priority: string;
}

// Cobertura de um Goal: quais épicos contribuem para ele.
export interface GoalCoverage {
  goal: Goal;
  epics: RoadmapEpic[];
}

// Resumo de cobertura Épicos × OKRs.
export interface OKRSummary {
  totalEpics: number;
  withGoal: number;
  withoutGoal: number;
  coveragePct: number; // % de épicos com ao menos um Goal vinculado
  bySquad: { squad: Squad; total: number; withGoal: number; pct: number }[];
  byGoal: GoalCoverage[];        // goals que têm ≥1 épico, ordenados por contagem
  unlinkedGoals: Goal[];         // OKRs sem nenhum épico vinculado
  epicsWithoutGoal: RoadmapEpic[];
}

export interface SquadStats {
  squad: Squad;
  color: string;
  total: number;
  done: number;
  inTest: number;
  current: number;
  next: number;
  backlog: number;
  withGoal: number;   // épicos da squad com ao menos um Goal vinculado
  currentEpics: RoadmapEpic[];
}

export interface AtlasGoal {
  id: string;
  name: string;
  description?: string;
  status: string;
  progress: number;
  owner?: { accountId: string; displayName: string };
  targetDate?: string;
  parentGoalId?: string | null;
  url?: string;
}

export interface RoadmapData {
  cycle: {
    number: number;
    startDate: string;
    endDate: string;
    sprints: CycleSprint[];
    currentSprintNumber: number;
  };
  epics: RoadmapEpic[];
  goals: Goal[];        // todos os OKRs do workspace
  okr: OKRSummary;      // cobertura Épicos × OKRs
  squadStats: SquadStats[];
  summary: {
    total: number;
    done: number;
    inTest: number;
    current: number;
    next: number;
    backlog: number;
  };
  atlasGoals?: AtlasGoal[];
  lastUpdated: string;
}
