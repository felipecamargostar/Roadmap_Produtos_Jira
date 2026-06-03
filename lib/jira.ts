/**
 * jira.ts — Jira REST API v3 client
 *
 * Uses POST /rest/api/3/search/jql (cursor-based pagination via nextPageToken).
 * The legacy GET /rest/api/3/search endpoint returns 410 Gone — do not use it.
 *
 * Auth: Basic Auth (email + API token), base64-encoded.
 * Cache: 5 minutes (revalidate: 300) via Next.js fetch cache.
 */

const BASE_URL = process.env.JIRA_BASE_URL || "https://starbemapp.atlassian.net";
const EMAIL = process.env.JIRA_EMAIL || "";
const TOKEN = process.env.JIRA_API_TOKEN || "";
const PROJECT = process.env.JIRA_PROJECT_KEY || "ID";

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

async function jiraSearch(body: SearchBody): Promise<SearchResponse> {
  const res = await fetch(`${BASE_URL}/rest/api/3/search/jql`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    next: { revalidate: 300 },
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
    parent?: { key: string; fields: { summary: string } } | null;
    issuetype: { name: string };
  };
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
  "customfield_10020",
  "parent",
  "issuetype",
];

// Only fetch epics active in Cycle 2:
// - Not done yet (active work regardless of age), OR
// - Done/finalized during Cycle 2 (recently completed)
const EPIC_JQL = `project = ${PROJECT} AND issuetype = Epic AND (status != "FINALIZADO" OR updated >= "${CYCLE2_START}") ORDER BY status ASC, created DESC`;

/**
 * Fetches all Cycle 2 epics, paginating until exhausted.
 * Returns up to several hundred epics depending on project size.
 */
export async function fetchAllEpics(): Promise<JiraIssue[]> {
  const all: JiraIssue[] = [];
  let nextPageToken: string | undefined;

  do {
    const body: SearchBody = {
      jql: EPIC_JQL,
      fields: EPIC_FIELDS,
      maxResults: 100,
      ...(nextPageToken ? { nextPageToken } : {}),
    };
    const data = await jiraSearch(body);
    all.push(...data.issues);
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return all;
}

const STORY_FIELDS = ["summary", "status", "customfield_10020", "parent", "issuetype"];

/**
 * Fetches stories/tasks in active sprints.
 * Note: activeSprints() JQL requires board context — may return empty without it.
 * The primary active-sprint detection uses the epic's own sprint state field instead.
 */
export async function fetchActiveSprintIssues(): Promise<JiraIssue[]> {
  const data = await jiraSearch({
    jql: `project = ${PROJECT} AND issuetype in (Story, Task, Melhoria) AND sprint in activeSprints()`,
    fields: STORY_FIELDS,
    maxResults: 100,
  });
  return data.issues;
}

/**
 * Fetches stories/tasks in future (upcoming) sprints.
 * Used as fallback — primary detection via epic sprint state.
 */
export async function fetchNextSprintIssues(): Promise<JiraIssue[]> {
  const data = await jiraSearch({
    jql: `project = ${PROJECT} AND issuetype in (Story, Task, Melhoria) AND sprint in futureSprints()`,
    fields: STORY_FIELDS,
    maxResults: 100,
  });
  return data.issues;
}
