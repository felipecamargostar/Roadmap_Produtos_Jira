/**
 * jira.ts — Jira REST API v3 client
 *
 * Uses POST /rest/api/3/search/jql (cursor-based pagination via nextPageToken).
 * The legacy GET /rest/api/3/search endpoint returns 410 Gone — do not use it.
 *
 * Auth: Basic Auth (email + API token), base64-encoded.
 * Cache: 5 minutes (revalidate: 300) via Next.js fetch cache.
 */

import type { Goal } from "@/types";

const BASE_URL = process.env.JIRA_BASE_URL || "https://starbemapp.atlassian.net";
const EMAIL = process.env.JIRA_EMAIL || "";
const TOKEN = process.env.JIRA_API_TOKEN || "";
const PROJECT = process.env.JIRA_PROJECT_KEY || "ID";

// Cloud ID do site (necessário para a API do Atlassian Goals / townsquare).
const CLOUD_ID = process.env.JIRA_CLOUD_ID || "17130179-8c59-4cd1-887a-1e39fa2b10c2";

// Cycle 2 starts April 27, 2026
const CYCLE2_START = "2026-04-27";

function authHeader(): string {
  return "Basic " + Buffer.from(`${EMAIL}:${TOKEN}`).toString("base64");
}

interface SearchBody {
  jql: string;
  fields: string[];
  maxResults: number;
  nextPageToken?: string;
}

interface SearchResponse {
  issues: JiraIssue[];
  nextPageToken?: string;
  total?: number;
}

// Tempo de cache padrão (segundos). `fresh: true` ignora o cache (no-store),
// usado pelo botão "Atualizar agora" para refletir mudanças do Jira na hora.
const REVALIDATE_SECONDS = 60;
function cacheInit(fresh: boolean): RequestInit {
  return fresh ? { cache: "no-store" } : { next: { revalidate: REVALIDATE_SECONDS } };
}

async function jiraSearch(body: SearchBody, fresh = false): Promise<SearchResponse> {
  const res = await fetch(`${BASE_URL}/rest/api/3/search/jql`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    ...cacheInit(fresh),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Jira API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description: AdfDoc | null;
    status: { name: string };
    priority: { name: string } | null;
    customfield_10020: JiraSprint[] | null;
    // Team field — define a squad do épico (ex.: "Squad HR Experience")
    customfield_10001: JiraTeam | null;
    // Goals field — OKRs do Jira (Atlassian Goals) vinculados ao épico.
    // Cada item traz apenas o ARI do goal; o nome/status é resolvido via GraphQL.
    customfield_10049: { id: string }[] | null;
    // Datas do épico para posicionar a barra na timeline (fonte preferencial).
    customfield_10015: string | null; // Start date
    duedate: string | null;           // Due date
    parent?: { key: string; fields: { summary: string } } | null;
    issuetype: { name: string };
  };
}

export interface JiraTeam {
  id?: string;
  name?: string;
  title?: string;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: "active" | "closed" | "future";
  startDate?: string;
  endDate?: string;
  boardId?: number;
}

export interface AdfDoc {
  type: string;
  content?: AdfNode[];
  text?: string;
  attrs?: Record<string, unknown>;
}

export type AdfNode = AdfDoc;

const EPIC_FIELDS = [
  "summary",
  "description",
  "status",
  "priority",
  "customfield_10020", // Sprint
  "customfield_10001", // Team (squad)
  "customfield_10049", // Goals (OKRs do Jira)
  "customfield_10015", // Start date
  "duedate",           // Due date
  "parent",
  "issuetype",
];

// Regra de exibição: somente épicos que tenham
//   1. Team (squad) preenchido — customfield_10001
//   2. Sprint ativa OU futura declarada — sprint in openSprints()/futureSprints()
// openSprints() = sprints iniciadas e não concluídas (estado "active").
// futureSprints() = sprints planejadas mas ainda não iniciadas (estado "future").
// O reforço final do filtro (estado da sprint no próprio épico + team válido
// mapeável a uma squad conhecida) e a classificação atual/próximo são feitos em
// transform.ts.
const EPIC_JQL = `project = ${PROJECT} AND issuetype = Epic AND customfield_10001 IS NOT EMPTY AND (sprint IN openSprints() OR sprint IN futureSprints()) ORDER BY status ASC, created DESC`;

/**
 * Fetches all Cycle 2 epics, paginating until exhausted.
 * Returns up to several hundred epics depending on project size.
 */
export async function fetchAllEpics(fresh = false): Promise<JiraIssue[]> {
  const all: JiraIssue[] = [];
  let nextPageToken: string | undefined;

  do {
    const body: SearchBody = {
      jql: EPIC_JQL,
      fields: EPIC_FIELDS,
      maxResults: 100,
      ...(nextPageToken ? { nextPageToken } : {}),
    };
    const data = await jiraSearch(body, fresh);
    all.push(...data.issues);
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return all;
}

// ─── Atlassian Goals (OKRs) ──────────────────────────────────────────────────
// Os OKRs ficam no Atlassian Goals (townsquare), não no Jira Issues. São lidos
// via GraphQL no mesmo domínio do site, com a mesma credencial Basic.
// Endpoint: POST /gateway/api/graphql
// O container dos goals é o ARI do site: ari:cloud:townsquare::site/<cloudId>.

const GOALS_CONTAINER = `ari:cloud:townsquare::site/${CLOUD_ID}`;

const GOALS_QUERY = `query goals($cid: ID!, $after: String) {
  goals_search(containerId: $cid, first: 100, after: $after, searchString: "") {
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id
        key
        name
        url
        status { value }
        progress { percentage }
        targetDate { label }
        parentGoal { key }
      }
    }
  }
}`;

interface GoalNode {
  id: string;
  key: string;
  name: string;
  url: string | null;
  status: { value: string | null } | null;
  progress: { percentage: number | null } | null;
  targetDate: { label: string | null } | null;
  parentGoal: { key: string } | null;
}

async function jiraGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
  fresh = false
): Promise<T> {
  const res = await fetch(`${BASE_URL}/gateway/api/graphql`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    ...cacheInit(fresh),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Jira GraphQL ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`Jira GraphQL error: ${JSON.stringify(json.errors[0]).slice(0, 300)}`);
  }
  return json.data as T;
}

/**
 * Busca todos os Goals (OKRs) do workspace, paginando até esgotar.
 * Falhas são tratadas pelo chamador — se os goals não puderem ser lidos, o
 * roadmap ainda funciona, apenas sem a dimensão de OKRs.
 */
export async function fetchAllGoals(fresh = false): Promise<Goal[]> {
  const goals: Goal[] = [];
  let after: string | undefined;

  do {
    const data = await jiraGraphQL<{
      goals_search: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        edges: { node: GoalNode }[];
      };
    }>(GOALS_QUERY, { cid: GOALS_CONTAINER, after: after ?? null }, fresh);

    for (const { node } of data.goals_search.edges) {
      goals.push({
        id: node.id,
        key: node.key,
        name: node.name,
        status: node.status?.value ?? "unknown",
        // progress vem como fração (0–1) ou percentual conforme o tipo; o
        // townsquare devolve já em percentual (ex.: -3.5, 0, 60). Normalizamos.
        progress: Math.round((node.progress?.percentage ?? 0)),
        targetDate: node.targetDate?.label ?? null,
        parentKey: node.parentGoal?.key ?? null,
        url: node.url ?? `https://home.atlassian.com/goal/${node.key}`,
        isObjective: !node.parentGoal,
      });
    }

    after =
      data.goals_search.pageInfo.hasNextPage
        ? data.goals_search.pageInfo.endCursor ?? undefined
        : undefined;
  } while (after);

  return goals;
}
