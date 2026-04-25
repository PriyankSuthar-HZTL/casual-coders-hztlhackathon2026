// ——————————————————————————————————————
//  MigrateX — shared types
// ——————————————————————————————————————

export type StepKey =
  | "url"
  | "detect"
  | "integrations"
  | "match"
  | "page"
  | "preview"
  | "done";

// ——— Contentstack config ———
export type Region = "na" | "eu" | "au" | "azure-na" | "azure-eu" | "gcp-na";

export interface ContentstackConfig {
  apiKey: string;
  managementToken: string;
  /** Auth token from /v3/user-session login (alternative to managementToken) */
  authToken?: string;
  environment: string;
  region: Region;
}

// ——— Detection ———
export type ComponentKind =
  | "hero"
  | "feature_list"
  | "card_grid"
  | "testimonial"
  | "faq"
  | "cta_banner"
  | "rich_text"
  | "media_gallery"
  | "navigation"
  | "footer";

export type FieldType =
  | "single_line"
  | "multi_line"
  | "rich_text"
  | "url"
  | "file"
  | "boolean"
  | "number"
  | "group"
  | "reference";

export interface DetectedField {
  uid: string;
  displayName: string;
  type: FieldType;
  value: unknown;
  /** Origin of the value in the source DOM (css selector or xpath-ish) */
  source?: string;
  required?: boolean;
  /** For array / list fields, the inferred inner schema */
  itemSchema?: DetectedField[];
  /** File fields carry the source URL so the API route can upload */
  assetUrl?: string;
}

export interface DetectedComponent {
  /** Unique runtime id — component instance */
  id: string;
  kind: ComponentKind;
  /** Human label e.g. "Hero" */
  name: string;
  /** Suggested content type UID — snake_case */
  suggestedUid: string;
  /** 0..1 */
  confidence: number;
  /** Preview snippet for the row (italic serif) */
  preview: string;
  /** CSS selector of the DOM node this was detected from */
  selector: string;
  fields: DetectedField[];
  /** Raw outer HTML of the detected DOM node, used for the inspect preview */
  previewHtml?: string;
  /** 0-based index of the source URL in multi-URL mode; undefined or 0 = primary URL */
  sourceUrlIndex?: number;
}

// ——— Matching ———
export type MatchStatus = "matched" | "partial" | "missing";

export interface MatchResult {
  componentId: string;
  status: MatchStatus;
  /** Existing Contentstack content type UID if matched */
  contentTypeUid?: string;
  /** Display title of the matching CT */
  contentTypeTitle?: string;
  /** 0..1 — token similarity to the best match */
  similarity: number;
  /** User decision: auto-create a new CT? */
  willCreate?: boolean;
}

// ——— Contentstack schema ———
export interface ContentstackField {
  display_name: string;
  uid: string;
  data_type: string;
  mandatory?: boolean;
  multiple?: boolean;
  unique?: boolean;
  _default?: boolean;
  field_metadata?: Record<string, unknown>;
  schema?: ContentstackField[];
}

export interface ContentstackContentType {
  title: string;
  uid: string;
  schema: ContentstackField[];
  description?: string;
  options?: {
    is_page?: boolean;
    singleton?: boolean;
    title?: string;
    sub_title?: string[];
    url_pattern?: string;
    url_prefix?: string;
  };
}

// ——— Migration ———
export interface MigrationLog {
  level: "info" | "success" | "warn" | "error";
  message: string;
  timestamp: string;
}

export interface MigrationResult {
  success: boolean;
  dryRun: boolean;
  entriesCreated: number;
  contentTypesCreated: number;
  elapsedMs: number;
  logs: MigrationLog[];
  /** For dry runs: the JSON payload we would have sent */
  payload?: Record<string, unknown>;
  /** For real runs: URL back into Contentstack */
  stackUrl?: string;
  /** UID of the page entry created (if any) */
  pageEntryUid?: string;
}

// ——— Page content type ———

export interface PageTypeInfo {
  uid: string;
  title: string;
  /** True when the content type has is_page: true in options */
  isPage: boolean;
  /** True when the schema already has a modular_blocks (data_type: "blocks") field */
  hasModularBlocks: boolean;
  /** UIDs of component content types already wired as block types */
  existingBlockUids: string[];
}

// ——— API request/response shapes ———
// ——— LLM / detection mode ———

export type LlmProvider = "gemini" | "anthropic" | "groq";
export type DetectionMode = "heuristic" | "llm" | "hybrid";
export type UrlMode = "single" | "multi";

export const GEMINI_MODELS = [
  // gemini-1.5-flash is first because it is available on all free-tier keys.
  // gemini-2.0-flash may 404 for keys created before its GA or in restricted regions.
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash — recommended (all keys)" },
  { value: "gemini-1.5-pro",   label: "Gemini 1.5 Pro — most accurate" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash — fastest (paid / newer keys)" },
  { value: "gemini-flash-latest", label: "Gemini Flash (latest) — always tracks newest Flash" }
] as const;

/** Defaults before “Verify key” loads the live list from Anthropic. */
export const CLAUDE_MODELS = [
  {
    value: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4 — recommended",
  },
  {
    value: "claude-3-5-haiku-20241022",
    label: "Claude 3.5 Haiku — fast / economical",
  },
] as const;

export const DEFAULT_CLAUDE_MODEL = CLAUDE_MODELS[0].value;

/** Defaults before “Verify key” loads the live list from Groq. */
export const GROQ_MODELS = [
  {
    value: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B — recommended",
  },
  {
    value: "llama-3.1-8b-instant",
    label: "Llama 3.1 8B — fastest",
  },
  {
    value: "mixtral-8x7b-32768",
    label: "Mixtral 8x7B",
  },
] as const;

export const DEFAULT_GROQ_MODEL = GROQ_MODELS[0].value;

export interface LlmConfig {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  enabled: boolean;
  /**
   * Optional second vendor: if the primary LLM throws after retries, we try
   * this provider once (then heuristic in llm-only mode, or heuristic baseline in hybrid).
   */
  fallbackProvider?: LlmProvider;
  /** API key for `fallbackProvider` (or env for that vendor on the server). */
  fallbackApiKey?: string;
  fallbackModel?: string;
}

// ——— API request/response shapes ———

export interface ScrapeRequest {
  url: string;
  /** All URLs in multi-URL mode (first element matches `url`). */
  urls?: string[];
  urlMode?: UrlMode;
  detectionMode?: DetectionMode;
  llmConfig?: LlmConfig;
}
export interface ScrapeResponse {
  ok: boolean;
  url: string;
  title?: string;
  components: DetectedComponent[];
  /** Which detection method was actually used */
  detectionMethod?: string;
  /** Non-fatal warning from LLM (e.g. fallback message) */
  llmWarning?: string;
  /** The LLM model that actually ran — may differ from the requested model if we auto-substituted because the configured one was unavailable. The client should persist this to its store. */
  modelUsed?: string;
  /** Number of URLs scanned in multi-URL mode */
  multiUrlCount?: number;
  error?: string;
}

export interface ContentstackTestRequest {
  config: ContentstackConfig;
}
export interface ContentstackTestResponse {
  ok: boolean;
  contentTypeCount?: number;
  stackName?: string;
  error?: string;
}

export interface MatchRequest {
  config: ContentstackConfig;
  components: DetectedComponent[];
}
export interface MatchResponse {
  ok: boolean;
  matches: MatchResult[];
  error?: string;
}

export interface CreateContentTypeRequest {
  config: ContentstackConfig;
  component: DetectedComponent;
}
export interface CreateContentTypeResponse {
  ok: boolean;
  contentType?: ContentstackContentType;
  error?: string;
}

export interface FetchPageTypesRequest {
  config: ContentstackConfig;
}
export interface FetchPageTypesResponse {
  ok: boolean;
  pageTypes: PageTypeInfo[];
  error?: string;
}

export interface CreatePageTypeRequest {
  config: ContentstackConfig;
  /** Human-readable page type name, e.g. "Page" */
  pageTitle: string;
  /** snake_case UID, e.g. "page" */
  pageUid: string;
  /** Content-type UIDs of the components to wire as Modular Block types */
  componentUids: string[];
  /** Matching display titles (same order as componentUids) */
  componentTitles: string[];
}
export interface CreatePageTypeResponse {
  ok: boolean;
  contentType?: ContentstackContentType;
  error?: string;
}

export interface MigrateRequest {
  config: ContentstackConfig;
  components: DetectedComponent[];
  matches: MatchResult[];
  dryRun: boolean;
  uploadAssets: boolean;
  /** Page content type UID to create a page entry under (optional) */
  pageTypeUid?: string | null;
  /** Component instance IDs whose entries should appear in Modular Blocks */
  pageComponentIds?: string[];
  /** URL slug for the page entry, e.g. "/about-us" */
  pageEntryUrl?: string;
  /** Display title for the page entry */
  pageEntryTitle?: string;
}
export interface MigrateResponse {
  ok: boolean;
  result: MigrationResult;
  error?: string;
}

// ——— Jira / Confluence integrations ———

export interface AtlassianConfig {
  siteUrl: string;
  email: string;
  apiToken: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
}

export interface JiraDraft {
  summary: string;
  description: string;
}

export interface ConfluenceDraft {
  title: string;
  content: string;
}

export interface AtlassianConnectRequest {
  config: AtlassianConfig;
  includeJira: boolean;
  includeConfluence: boolean;
}

export interface AtlassianConnectResponse {
  ok: boolean;
  jiraProjects: JiraProject[];
  confluenceSpaces: ConfluenceSpace[];
  error?: string;
}

export interface IntegrationGenerateRequest {
  url: string;
  components: DetectedComponent[];
  /** When provided and enabled, LLM generates rich Confluence functional specs. */
  llmConfig?: LlmConfig;
}

/** One row per detected component — never batched into a single ticket/page. */
export interface IntegrationComponentDraft {
  componentId: string;
  componentName: string;
  jiraDraft: JiraDraft;
  confluenceDraft: ConfluenceDraft;
}

export interface IntegrationGenerateResponse {
  ok: boolean;
  componentDrafts?: IntegrationComponentDraft[];
  error?: string;
}

/** What already exists for a component — used to skip duplicate creates. */
export interface IntegrationComponentSyncState {
  jiraKey?: string;
  jiraUrl?: string;
  confluencePageId?: string;
  confluenceUrl?: string;
}

export interface IntegrationSubmitItem {
  componentId: string;
  /** Display name from detection (for logs / UI). */
  componentName?: string;
  jiraDraft?: JiraDraft;
  confluenceDraft?: ConfluenceDraft;
}

export interface IntegrationSubmitRequest {
  config: AtlassianConfig;
  createJira: boolean;
  createConfluence: boolean;
  jiraProjectId?: string;
  confluenceSpaceKey?: string;
  /** One entry per component to sync (drafts omitted when that target is disabled). */
  items: IntegrationSubmitItem[];
  /** Skip creates when this component already has the corresponding artifact. */
  existingSync?: Record<string, IntegrationComponentSyncState>;
}

export interface IntegrationSubmitResult {
  ok: boolean;
  /** True when create was skipped because existingSync already had this artifact. */
  skipped?: boolean;
  id?: string;
  url?: string;
  error?: string;
}

export interface IntegrationComponentResult {
  componentId: string;
  componentName?: string;
  jira?: IntegrationSubmitResult;
  confluence?: IntegrationSubmitResult;
  /** Step-by-step outcome for debugging / retries. */
  log?: string[];
}

export interface IntegrationSubmitResponse {
  ok: boolean;
  /** True only when every requested create for every component succeeded (not skipped failures). */
  allSucceeded?: boolean;
  components?: IntegrationComponentResult[];
  error?: string;
}
