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

export type KRKey = "KR1" | "KR2" | "KR3" | "KR4" | "KR5" | "Sem OKR";
export type RoadmapStatus = "done" | "in_test" | "current" | "next" | "backlog";

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
  kr: KRKey;
  krTitle: string;
  objective: string;
  productThesis: string;
  sprintStart: number;  // 1-8
  sprintEnd: number;    // 1-8 (>= sprintStart for bar spanning)
  jiraUrl: string;
  priority: string;
}

export interface KRStats {
  key: KRKey;
  label: string;
  color: string;
  count: number;
  epics: RoadmapEpic[];
  bySquad: Partial<Record<Squad, number>>;
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
  byKR: Partial<Record<KRKey, number>>;
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
  krStats: KRStats[];
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
