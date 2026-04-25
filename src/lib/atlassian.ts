import { formatConfluenceTitle, formatJiraSummary } from "@/lib/integration-titles";
import type {
  AtlassianConfig,
  ConfluenceDraft,
  ConfluenceSpace,
  DetectedComponent,
  IntegrationComponentDraft,
  JiraDraft,
  JiraProject,
} from "@/types";

interface AtlassianErrorPayload {
  errorMessages?: string[];
  errors?: Record<string, string>;
  message?: string;
}

interface JiraProjectSearchResponse {
  values?: Array<{ id?: string; key?: string; name?: string }>;
}

interface ConfluenceSpaceResponse {
  results?: Array<{ id?: string; key?: string; name?: string }>;
}

interface JiraIssueCreateResponse {
  key?: string;
}

interface ConfluencePageCreateResponse {
  id?: string;
  _links?: {
    webui?: string;
  };
}

interface ConfluencePageGetResponse {
  id?: string;
  title?: string;
  type?: string;
  space?: { key?: string };
  version?: { number?: number };
  body?: {
    storage?: {
      value?: string;
      representation?: string;
    };
  };
}

interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
}

interface AdfDocument {
  type: "doc";
  version: 1;
  content: AdfNode[];
}

function normalizeSiteUrl(siteUrl: string): string {
  const url = siteUrl.trim();
  if (!url) return "";
  const prefixed = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return prefixed.replace(/\/+$/, "");
}

function getAuthHeader(config: AtlassianConfig): string {
  const token = Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");
  return `Basic ${token}`;
}

async function atlassianRequest<T>(
  config: AtlassianConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const baseUrl = normalizeSiteUrl(config.siteUrl);
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: getAuthHeader(config),
      ...(init.body
        ? {
            "Content-Type": "application/json",
          }
        : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Atlassian API request failed (${response.status})`;
    try {
      const parsed = JSON.parse(text) as AtlassianErrorPayload;
      if (parsed.errorMessages?.length) {
        message = parsed.errorMessages.join(" ");
      } else if (parsed.message) {
        message = parsed.message;
      } else if (parsed.errors && Object.keys(parsed.errors).length) {
        message = Object.values(parsed.errors).join(" ");
      }
    } catch {
      if (text.trim()) message = text;
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function fetchJiraProjects(
  config: AtlassianConfig,
): Promise<JiraProject[]> {
  const data = await atlassianRequest<JiraProjectSearchResponse>(
    config,
    "/rest/api/3/project/search?maxResults=100",
  );
  return (data.values ?? [])
    .filter((p) => p.id && p.key && p.name)
    .map((p) => ({
      id: p.id!,
      key: p.key!,
      name: p.name!,
    }));
}

export async function fetchConfluenceSpaces(
  config: AtlassianConfig,
): Promise<ConfluenceSpace[]> {
  const data = await atlassianRequest<ConfluenceSpaceResponse>(
    config,
    "/wiki/rest/api/space?limit=100",
  );
  return (data.results ?? [])
    .filter((space) => space.id && space.key && space.name)
    .map((space) => ({
      id: space.id!,
      key: space.key!,
      name: space.name!,
    }));
}

function toAdf(description: string): AdfDocument {
  const lines = description.split(/\r?\n/);
  const content: AdfNode[] = [];
  let listItems: AdfNode[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    content.push({
      type: "bulletList",
      content: listItems,
    });
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    if (trimmed.startsWith("- ")) {
      listItems.push({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: trimmed.slice(2) }],
          },
        ],
      });
      continue;
    }
    flushList();
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: trimmed }],
    });
  }
  flushList();

  if (!content.length) {
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: "(No description)" }],
    });
  }

  return { type: "doc", version: 1, content };
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Render inline markdown: **bold**, `code`, leaving other text escaped. */
function renderInline(text: string): string {
  // Escape HTML first, then un-escape our own tags so we control the output.
  // Process inline patterns left-to-right using a simple token pass.
  const parts: string[] = [];
  let rest = text;
  // Patterns ordered so longer delimiters win.
  const patterns: Array<{ re: RegExp; open: string; close: string }> = [
    { re: /\*\*(.+?)\*\*/s, open: "<strong>", close: "</strong>" },
    { re: /`(.+?)`/s, open: "<code>", close: "</code>" },
  ];

  outer: while (rest.length) {
    let earliest: { index: number; match: RegExpExecArray; open: string; close: string } | null = null;
    for (const { re, open, close } of patterns) {
      const m = re.exec(rest);
      if (m && (earliest === null || m.index < earliest.index)) {
        earliest = { index: m.index, match: m, open, close };
      }
    }
    if (!earliest) {
      parts.push(escapeHtml(rest));
      break outer;
    }
    if (earliest.index > 0) {
      parts.push(escapeHtml(rest.slice(0, earliest.index)));
    }
    parts.push(`${earliest.open}${escapeHtml(earliest.match[1])}${earliest.close}`);
    rest = rest.slice(earliest.index + earliest.match[0].length);
  }
  return parts.join("");
}

function toConfluenceStorage(content: string): string {
  const lines = content.split(/\r?\n/);
  let html = "";
  let inUl = false;
  let inOl = false;

  const closeUl = () => { if (inUl) { html += "</ul>"; inUl = false; } };
  const closeOl = () => { if (inOl) { html += "</ol>"; inOl = false; } };
  const closeLists = () => { closeUl(); closeOl(); };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      closeLists();
      continue;
    }

    // Headings: # H1, ## H2, ### H3 (LLM may emit any level)
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      closeLists();
      const level = headingMatch[1].length; // 1, 2, or 3
      html += `<h${level}>${renderInline(headingMatch[2])}</h${level}>`;
      continue;
    }

    // Unordered list: "- item"
    if (/^[-*]\s/.test(trimmed)) {
      closeOl();
      if (!inUl) { html += "<ul>"; inUl = true; }
      html += `<li>${renderInline(trimmed.slice(2))}</li>`;
      continue;
    }

    // Ordered list: "1. item", "2. item", …
    const olMatch = /^\d+\.\s+(.+)$/.exec(trimmed);
    if (olMatch) {
      closeUl();
      if (!inOl) { html += "<ol>"; inOl = true; }
      html += `<li>${renderInline(olMatch[1])}</li>`;
      continue;
    }

    closeLists();
    html += `<p>${renderInline(trimmed)}</p>`;
  }

  closeLists();
  return html;
}

export async function createJiraIssue(
  config: AtlassianConfig,
  projectId: string,
  draft: JiraDraft,
): Promise<{ issueKey: string; issueUrl: string }> {
  const data = await atlassianRequest<JiraIssueCreateResponse>(
    config,
    "/rest/api/3/issue",
    {
      method: "POST",
      body: JSON.stringify({
        fields: {
          project: { id: projectId },
          summary: draft.summary,
          issuetype: { name: "Task" },
          description: toAdf(draft.description),
        },
      }),
    },
  );

  if (!data.key) throw new Error("Jira issue key missing in response");
  const baseUrl = normalizeSiteUrl(config.siteUrl);
  return {
    issueKey: data.key,
    issueUrl: `${baseUrl}/browse/${data.key}`,
  };
}

export async function createConfluencePage(
  config: AtlassianConfig,
  spaceKey: string,
  draft: ConfluenceDraft,
): Promise<{ pageId: string; pageUrl: string }> {
  const data = await atlassianRequest<ConfluencePageCreateResponse>(
    config,
    "/wiki/rest/api/content",
    {
      method: "POST",
      body: JSON.stringify({
        type: "page",
        title: draft.title,
        space: { key: spaceKey },
        body: {
          storage: {
            value: toConfluenceStorage(draft.content),
            representation: "storage",
          },
        },
      }),
    },
  );

  if (!data.id) throw new Error("Confluence page id missing in response");
  const baseUrl = normalizeSiteUrl(config.siteUrl);
  const webPath = data._links?.webui;
  return {
    pageId: data.id,
    pageUrl: webPath ? `${baseUrl}${webPath}` : `${baseUrl}/wiki`,
  };
}

function fieldValuePreview(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 200 ? `${t.slice(0, 200)}…` : t || "—";
  }
  if (typeof value === "object") {
    try {
      const s = JSON.stringify(value);
      return s.length > 200 ? `${s.slice(0, 200)}…` : s;
    } catch {
      return "[object]";
    }
  }
  return String(value);
}

function inferRelationshipLines(
  component: DetectedComponent,
  allOnPage: DetectedComponent[],
): string[] {
  const lines: string[] = [];
  const refFields = component.fields.filter((f) => f.type === "reference");
  if (refFields.length) {
    lines.push("## Detected dependencies (reference fields)");
    for (const f of refFields) {
      lines.push(
        `- ${f.displayName} (${f.uid}) — points to related content in the target stack`,
      );
    }
  }
  const urlFields = component.fields.filter((f) => f.type === "url");
  if (urlFields.length) {
    lines.push("## Links captured from this block");
    for (const f of urlFields) {
      const v = f.value as { title?: string; href?: string } | undefined;
      const href = v?.href ?? "";
      const title = v?.title ?? "";
      lines.push(
        `- ${f.displayName}: ${title ? `${title} — ` : ""}${href || "(no href)"}`,
      );
    }
  }
  const peers = allOnPage.filter((c) => c.id !== component.id);
  if (peers.length) {
    lines.push("## Same-page context (other detected components)");
    lines.push(
      "These blocks were detected alongside this one on the scanned page — review together for layout and modular-block wiring.",
    );
    for (const p of peers) {
      lines.push(`- ${p.name} (${p.kind}) — selector: ${p.selector}`);
    }
  }
  if (!lines.length) {
    lines.push("## Dependencies / relationships");
    lines.push(
      "- No reference fields, outbound links, or other detected blocks to relate beyond this component itself.",
    );
  }
  return lines;
}

function schemaLines(component: DetectedComponent): string[] {
  const lines: string[] = [
    "## Inferred schema / structure",
    `- Suggested Contentstack UID: ${component.suggestedUid}`,
    `- Detection confidence: ${Math.round(component.confidence * 100)}%`,
    "",
    "### Fields",
  ];
  for (const f of component.fields) {
    const req = f.required ? "required" : "optional";
    const src = f.source ? ` — source: ${f.source}` : "";
    lines.push(
      `- **${f.displayName}** (\`${f.uid}\`) — type \`${f.type}\`, ${req}${src}`,
    );
    lines.push(`  - Sample value: ${fieldValuePreview(f.value)}`);
    if (f.itemSchema?.length) {
      lines.push(
        `  - Item schema: ${f.itemSchema.map((i) => `${i.uid}:${i.type}`).join(", ")}`,
      );
    }
  }
  return lines;
}

function behaviorMetadataLines(component: DetectedComponent): string[] {
  return [
    "## Layout & behavior (from detection)",
    `- DOM selector: \`${component.selector}\``,
    `- Preview text: ${component.preview || "—"}`,
    `- Component kind: \`${component.kind}\``,
  ];
}

function buildSharedBodyLines(
  sourceUrl: string,
  component: DetectedComponent,
  allOnPage: DetectedComponent[],
): string[] {
  return [
    `Source URL: ${sourceUrl}`,
    "",
    "## Component overview",
    component.preview || "No preview string available.",
    "",
    ...behaviorMetadataLines(component),
    "",
    ...schemaLines(component),
    "",
    ...inferRelationshipLines(component, allOnPage),
  ];
}

export function buildPerComponentIntegrationDrafts(input: {
  url: string;
  components: DetectedComponent[];
}): IntegrationComponentDraft[] {
  const all = input.components;
  return all.map((component) => {
    const name = component.name.trim() || component.kind;
    const body = buildSharedBodyLines(input.url, component, all).join("\n");
    const jiraDescription = [
      body,
      "",
      "## Acceptance",
      "- Validate field mapping against the live DOM",
      "- Confirm modular block / entry wiring in Contentstack",
    ].join("\n");
    const confluenceContent = [
      body,
      "",
      "## Traceability",
      "- A matching Jira ticket will be linked here after sync (when Jira is enabled).",
    ].join("\n");
    return {
      componentId: component.id,
      componentName: name,
      jiraDraft: {
        summary: formatJiraSummary(name),
        description: jiraDescription,
      },
      confluenceDraft: {
        title: formatConfluenceTitle(name),
        content: confluenceContent,
      },
    };
  });
}

export async function getConfluencePageStorage(
  config: AtlassianConfig,
  pageId: string,
): Promise<{
  title: string;
  spaceKey: string;
  storageHtml: string;
  version: number;
}> {
  const data = await atlassianRequest<ConfluencePageGetResponse>(
    config,
    `/wiki/rest/api/content/${encodeURIComponent(pageId)}?expand=body.storage,version,space`,
  );
  const version = data.version?.number;
  if (typeof version !== "number") {
    throw new Error("Confluence page version missing");
  }
  const storageHtml = data.body?.storage?.value ?? "";
  const title = data.title ?? "Untitled";
  const spaceKey = data.space?.key ?? "";
  if (!spaceKey) throw new Error("Confluence page space key missing");
  return { title, spaceKey, storageHtml, version };
}

export async function updateConfluencePageStorage(
  config: AtlassianConfig,
  pageId: string,
  nextStorageHtml: string,
  versionMessage?: string,
): Promise<void> {
  const current = await getConfluencePageStorage(config, pageId);
  await atlassianRequest<unknown>(
    config,
    `/wiki/rest/api/content/${encodeURIComponent(pageId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        id: pageId,
        type: "page",
        title: current.title,
        space: { key: current.spaceKey },
        body: {
          storage: {
            value: nextStorageHtml,
            representation: "storage",
          },
        },
        version: {
          number: current.version + 1,
          message: versionMessage ?? "MigrateX: update page body",
        },
      }),
    },
  );
}

export function appendJiraTraceSectionToConfluenceHtml(
  storageHtml: string,
  issueKey: string,
  issueUrl: string,
): string {
  const block = `<h2>Related Jira</h2><p><a href="${escapeHtml(issueUrl)}">${escapeHtml(issueKey)}</a></p>`;
  if (storageHtml.includes(">Related Jira<")) {
    return storageHtml;
  }
  return `${storageHtml}${block}`;
}

export function appendConfluenceTraceToJiraDescription(
  description: string,
  pageUrl: string,
): string {
  if (description.includes(pageUrl)) return description;
  return [
    description.trimEnd(),
    "",
    "## Related documentation (Confluence)",
    pageUrl,
  ].join("\n");
}
