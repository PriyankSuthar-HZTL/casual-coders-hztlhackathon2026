// ——————————————————————————————————————
//  MigrateX — LLM-based component detector
//  Uses the official @google/generative-ai SDK (Gemini) with JSON output mode.
// ——————————————————————————————————————

import axios from "axios";
import * as cheerio from "cheerio";
import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  GoogleGenerativeAIResponseError,
} from "@google/generative-ai";
import type {
  ComponentKind,
  DetectedComponent,
  DetectedField,
  FieldType,
  LlmConfig,
} from "@/types";

// —— Constants ——

const VALID_KINDS: ComponentKind[] = [
  "hero", "feature_list", "card_grid", "testimonial",
  "faq", "cta_banner", "rich_text", "media_gallery",
];

const VALID_FIELD_TYPES: FieldType[] = [
  "single_line", "multi_line", "rich_text", "url", "file",
  "boolean", "number", "group", "reference",
];

// Minimum meaningful stripped-HTML length before we bother calling the LLM.
const MIN_HTML_CHARS = 400;

// Retry / backoff (free tier = 15 RPM).
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 5_000; // 5 s → 10 s → 20 s

// Free-tier Gemini quota: 15 generateContent requests / 60 s / key.
// We keep a sliding window of timestamps and sleep the request until a slot
// opens, so bursts get paced rather than 429-ing. Retry still protects against
// external usage of the same key outside this process.
const RATE_LIMIT_RPM = 15;
const RATE_LIMIT_WINDOW_MS = 60_000;
const _rateTimestamps: number[] = [];

// —— In-memory caches (server process lifetime) ——

interface ModelCacheEntry { ok: boolean; error?: string; ts: number }
// Key: `${model}:${last8OfApiKey}` — re-validated every 10 min.
const _modelCache = new Map<string, ModelCacheEntry>();
const MODEL_CACHE_TTL = 10 * 60_000;

interface ResultCacheEntry { components: DetectedComponent[]; ts: number }
// Key: FNV hash of url+model+mode — evicted after 5 min or when > 30 entries.
const _resultCache = new Map<string, ResultCacheEntry>();
const RESULT_CACHE_TTL = 5 * 60_000;
const RESULT_CACHE_MAX = 30;

// —— Hashing ——

// FNV-1a 32-bit — fast, no imports needed, good enough for cache keys.
function fnv32(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

// —— HTML preparation ——

function stripHtml(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, template, link[rel='stylesheet']").remove();
  $("svg").each((_, el) => {
    const $el = $(el);
    const label = $el.attr("aria-label") ?? "";
    $el.replaceWith(`<svg${label ? ` aria-label="${label}"` : ""}>[icon]</svg>`);
  });
  const keepAttrs = new Set([
    "id", "class", "href", "src", "alt", "aria-label",
    "role", "data-component", "type",
  ]);
  $("*").each((_, el) => {
    if (el.type !== "tag") return;
    for (const attr of Object.keys(el.attribs ?? {})) {
      if (!keepAttrs.has(attr)) {
        delete el.attribs[attr];
      } else if (attr === "class") {
        // Truncate long utility-CSS class strings to reduce token count
        const val = el.attribs[attr];
        if (val && val.length > 80) el.attribs[attr] = val.slice(0, 80);
      }
    }
  });
  return ($("body").html() ?? "").replace(/\s{2,}/g, " ").trim();
}

// —— Model pre-flight ——

// Fetch the list of generateContent-capable Gemini models for this key and
// pick the best available fallback: prefer flash (cheap/fast), then pro, then
// anything else. Returns null when the key has no usable model or the list
// call itself fails.
async function findFirstAvailableModel(apiKey: string): Promise<string | null> {
  try {
    const res = await axios.get<{
      models: Array<{ name: string; supportedGenerationMethods?: string[] }>;
    }>(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { timeout: 10_000 },
    );
    const models = (res.data.models ?? [])
      .filter(
        (m) =>
          m.supportedGenerationMethods?.includes("generateContent") &&
          m.name.startsWith("models/gemini"),
      )
      .map((m) => m.name.replace(/^models\//, ""))
      .sort((a, b) => {
        const tier = (v: string) =>
          v.includes("flash") ? 0 : v.includes("pro") ? 1 : 2;
        return tier(a) - tier(b);
      });
    return models[0] ?? null;
  } catch (err) {
    console.warn(
      `[llm-detector] findFirstAvailableModel failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

async function checkModelAvailability(
  model: string,
  apiKey: string,
): Promise<{ ok: boolean; error?: string; status?: number }> {
  const cacheKey = `${model}:${apiKey.slice(-8)}`;
  const cached = _modelCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < MODEL_CACHE_TTL) {
    return { ok: cached.ok, error: cached.error };
  }

  // The Gemini model resource path always uses the full "models/{id}" form.
  // Strip a "models/" prefix if the stored model ID somehow already has it.
  const modelId = model.replace(/^models\//, "");
  console.log(`[llm-detector] Pre-flight: checking model "${modelId}"…`);

  try {
    await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}?key=${apiKey}`,
      { timeout: 10_000 },
    );
    _modelCache.set(cacheKey, { ok: true, ts: Date.now() });
    console.log(`[llm-detector] Pre-flight: model "${modelId}" is available ✓`);
    return { ok: true };
  } catch (err) {
    let error: string;
    let status: number | undefined;
    if (axios.isAxiosError(err)) {
      status = err.response?.status;
      if (status === 404) {
        error = `Model "${modelId}" not found for this API key.`;
      } else if (status === 403) {
        error = `API key lacks access to "${modelId}".`;
      } else if (status === 429) {
        // Don't block on a rate-limited pre-flight — let the generation attempt proceed.
        console.warn(`[llm-detector] Pre-flight rate-limited (429), skipping model check`);
        _modelCache.set(cacheKey, { ok: true, ts: Date.now() });
        return { ok: true };
      } else {
        error = `Model check failed (HTTP ${status ?? "network"}): ${err.message}`;
      }
    } else {
      error = `Model check failed: ${err instanceof Error ? err.message : String(err)}`;
    }
    console.error(`[llm-detector] Pre-flight: ${error}`);
    _modelCache.set(cacheKey, { ok: false, error, ts: Date.now() });
    return { ok: false, error, status };
  }
}

// —— Gate check ——

export interface GateCheckResult {
  pass: boolean;
  /** Reason the gate rejected the request — shown in the UI as llmWarning. */
  reason?: string;
  /** True when a cached result exists for this url+model+mode combination. */
  cacheHit?: boolean;
  cachedComponents?: DetectedComponent[];
  /** The model that should actually be used — may differ from config.model when the configured one was unavailable and we substituted. */
  resolvedModel?: string;
  /** Human-readable notice when a substitution happened — surfaced to the client as llmWarning. */
  notice?: string;
}

export async function runGateCheck(
  html: string,
  config: LlmConfig,
  url: string,
  mode: string,
): Promise<GateCheckResult> {
  // 1. API key must be present.
  if (!config.apiKey.trim()) {
    return { pass: false, reason: "No Gemini API key configured." };
  }

  // 2. Page must have enough content to be worth sending.
  const stripped = stripHtml(html);
  if (stripped.length < MIN_HTML_CHARS) {
    console.log(
      `[llm-detector] Gate rejected: stripped HTML only ${stripped.length} chars (min ${MIN_HTML_CHARS})`,
    );
    return {
      pass: false,
      reason:
        `Page has too little content (${stripped.length} chars after stripping scripts/styles). ` +
        `Falling back to heuristics.`,
    };
  }

  // 3. Deduplication: skip if we already processed this url+model+mode recently.
  const cacheKey = fnv32(`${url}|${config.model}|${mode}`);
  const cached = _resultCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < RESULT_CACHE_TTL) {
    const ageS = Math.round((Date.now() - cached.ts) / 1000);
    console.log(
      `[llm-detector] Cache hit for url=${url} model=${config.model} (${ageS}s ago) — returning cached result`,
    );
    return { pass: true, cacheHit: true, cachedComponents: cached.components };
  }

  // 4. Validate the selected model is reachable with this API key. If the
  //    configured model is unavailable (404/403), try to find any usable
  //    Gemini model and substitute rather than failing.
  const modelCheck = await checkModelAvailability(config.model, config.apiKey);
  if (modelCheck.ok) {
    return { pass: true, resolvedModel: config.model };
  }

  if (modelCheck.status === 404 || modelCheck.status === 403) {
    const fallback = await findFirstAvailableModel(config.apiKey);
    if (fallback && fallback !== config.model) {
      console.warn(
        `[llm-detector] Configured model "${config.model}" unavailable — substituting "${fallback}"`,
      );
      // Warm the pre-flight cache for the fallback so we don't re-check it immediately.
      _modelCache.set(`${fallback}:${config.apiKey.slice(-8)}`, {
        ok: true,
        ts: Date.now(),
      });
      return {
        pass: true,
        resolvedModel: fallback,
        notice: `Configured model "${config.model}" is not available for your key. Using "${fallback}" instead — saved to settings.`,
      };
    }
  }

  return { pass: false, reason: modelCheck.error };
}

function cacheResult(
  url: string,
  model: string,
  mode: string,
  components: DetectedComponent[],
): void {
  const key = fnv32(`${url}|${model}|${mode}`);
  _resultCache.set(key, { components, ts: Date.now() });
  // LRU eviction: keep newest MAX entries.
  if (_resultCache.size > RESULT_CACHE_MAX) {
    const [oldest] = [..._resultCache.entries()].sort(
      ([, a], [, b]) => a.ts - b.ts,
    );
    if (oldest) _resultCache.delete(oldest[0]);
  }
}

// —— Prompt builders ——

const SCHEMA_EXAMPLE = `{"components":[{"id":"c_1_hero","kind":"hero","name":"Hero","suggestedUid":"hero","confidence":0.92,"preview":"Short preview text","selector":"section.hero","fields":[{"uid":"headline","displayName":"Headline","type":"single_line","value":"Actual headline text","required":true},{"uid":"cta","displayName":"CTA","type":"url","value":{"title":"Start","href":"https://x.com"}}]}]}`;

function buildDetectPrompt(strippedHtml: string, baseUrl: string): string {
  return `You are a web component detector analyzing ${baseUrl}.

Identify distinct content sections/components. Skip navigation, header, and footer elements.

Valid kinds: ${VALID_KINDS.join(", ")}
Valid field types: ${VALID_FIELD_TYPES.join(", ")}

Rules:
- "url" fields: value = { "title": string, "href": string }
- "group" fields: include "itemSchema" (schema) and "value" (items array)
- "file" fields: value = image URL string
- Extract ACTUAL text from the HTML — no placeholders
- confidence: 0.35–0.99, suggestedUid: snake_case ≤40 chars

Return ONLY valid JSON:
${SCHEMA_EXAMPLE}

HTML:
${strippedHtml.slice(0, 18_000)}`;
}

function buildHybridPrompt(
  strippedHtml: string,
  baseUrl: string,
  heuristicComponents: DetectedComponent[],
): string {
  return `You are improving web component detection results for ${baseUrl}.

A structural heuristic detected these components. For each:
1. Confirm or correct the component kind
2. Adjust confidence (0.35–0.99) based on actual content
3. Replace placeholder field values with ACTUAL text from the HTML
4. Add significant content sections the heuristic missed

Keep existing "id" values. New components: use ids like "c_llm_1_hero".

Heuristic results:
${JSON.stringify(heuristicComponents, null, 2).slice(0, 6_000)}

Return ONLY valid JSON in the same schema. Include ALL components.

HTML:
${strippedHtml.slice(0, 12_000)}`;
}

/** Strip optional ``` / ```json fences if the model returns markdown-wrapped JSON. */
function stripJsonMarkdownFences(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/u, "")
      .trim();
  }
  return t;
}

// —— Core API call with retry ——

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// Block until the sliding window has room for another generateContent call,
// then reserve a slot. Safe for concurrent awaiters: each wake-up re-evaluates
// the window state atomically within a single event-loop turn.
async function waitForRateSlot(): Promise<void> {
  // `while (true)` is intentional — we re-check after every sleep in case
  // multiple requests were queued and woke at the same time.
  while (true) {
    const now = Date.now();
    while (
      _rateTimestamps.length > 0 &&
      now - _rateTimestamps[0] > RATE_LIMIT_WINDOW_MS
    ) {
      _rateTimestamps.shift();
    }
    if (_rateTimestamps.length < RATE_LIMIT_RPM) {
      _rateTimestamps.push(now);
      return;
    }
    // Wait until the oldest timestamp ages out. +100 ms cushion to avoid
    // racing Google's window boundary.
    const waitMs =
      RATE_LIMIT_WINDOW_MS - (now - _rateTimestamps[0]) + 100;
    console.log(
      `[llm-detector] Rate limit full (${_rateTimestamps.length}/${RATE_LIMIT_RPM} in 60s) — waiting ${waitMs}ms for slot…`,
    );
    await sleep(waitMs);
  }
}

async function callGemini(
  config: LlmConfig,
  prompt: string,
): Promise<DetectedComponent[]> {
  // Strip "models/" prefix — the Gemini list API returns "models/gemini-1.5-flash"
  // but the SDK model id is just "gemini-1.5-flash".
  const modelId = (config.model || "gemini-1.5-flash").replace(
    /^models\//,
    "",
  );
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const generativeModel = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  });

  const promptTokenEstimate = Math.round(prompt.length / 4);

  console.log(
    `[llm-detector] Calling Gemini (SDK)  model=${modelId}  prompt≈${promptTokenEstimate} tokens`,
  );

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const waitMs = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
      console.log(
        `[llm-detector] Retry ${attempt}/${MAX_RETRIES}: waiting ${waitMs}ms…`,
      );
      await sleep(waitMs);
    }

    // Reserve an RPM slot before each attempt (including retries) — prevents
    // 429s from concurrent scans within the same process.
    await waitForRateSlot();

    try {
      const t0 = Date.now();
      const { response } = await generativeModel.generateContent(prompt, {
        timeout: 60_000,
      });

      let text: string;
      try {
        text = response.text().trim();
      } catch (err) {
        if (err instanceof GoogleGenerativeAIResponseError) {
          const r = err.response;
          const fr = r?.candidates?.[0]?.finishReason ?? "unknown";
          const block = r?.promptFeedback?.blockReason;
          const blockPart =
            block && block !== "BLOCKED_REASON_UNSPECIFIED"
              ? ` blockReason=${String(block)}`
              : "";
          throw new Error(
            `Empty or blocked response from Gemini (finishReason: ${String(fr)})${blockPart}. ` +
              `This can happen when the prompt is flagged by safety filters.`,
          );
        }
        throw err;
      }

      if (!text) {
        const reason = response.candidates?.[0]?.finishReason ?? "unknown";
        throw new Error(
          `Empty response from Gemini (finishReason: ${String(reason)}). ` +
            `This can happen when the prompt is flagged by safety filters.`,
        );
      }

      const parsedText = stripJsonMarkdownFences(text);
      const elapsed = Date.now() - t0;
      console.log(
        `[llm-detector] Gemini OK  ${elapsed}ms  response≈${Math.round(parsedText.length / 4)} tokens`,
      );

      const parsed = JSON.parse(parsedText) as { components?: unknown[] };
      if (!Array.isArray(parsed.components)) {
        throw new Error(
          "Gemini returned JSON but it is missing the top-level `components` array.",
        );
      }

      const components = parsed.components
        .map((c, i) => normalizeComponent(c, i))
        .filter((c): c is DetectedComponent => c !== null);

      console.log(
        `[llm-detector] Normalised ${parsed.components.length} raw → ${components.length} valid components`,
      );
      return components;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (err instanceof GoogleGenerativeAIFetchError) {
        const status = err.status;
        const detail = err.errorDetails
          ? JSON.stringify(err.errorDetails).slice(0, 200)
          : err.message;
        if (status === 404) {
          console.error(
            `[llm-detector] 404 — model "${modelId}" not found. ${detail}`,
          );
          throw new Error(
            `Model "${modelId}" not found (404). ` +
              `Open AI Settings and switch to Gemini 1.5 Flash.`,
          );
        }
        if (status === 403) {
          console.error(
            `[llm-detector] 403 — API key invalid or lacks permission. ${detail}`,
          );
          throw new Error(
            `API key rejected (403). ` +
              `Verify the key in AI Settings or re-verify with the "Test key" button.`,
          );
        }
        if (status === 400) {
          console.error(`[llm-detector] 400 — bad request. ${detail}`);
          throw new Error(
            `Gemini rejected the request (400). ${err.message}`,
          );
        }
        if (status === 429) {
          console.warn(
            `[llm-detector] 429 rate limit (attempt ${attempt + 1}/${MAX_RETRIES + 1})`,
          );
          if (attempt < MAX_RETRIES) continue;
          throw new Error(
            `Gemini rate limit exceeded after ${MAX_RETRIES + 1} attempts. ` +
              `Free tier allows 15 req/min — try again in a moment, or upgrade to a paid plan.`,
          );
        }
        if (status === undefined || (status >= 500 && status < 600)) {
          console.warn(
            `[llm-detector] HTTP ${String(status)} error (attempt ${attempt + 1}). ${err.message}`,
          );
          if (attempt < MAX_RETRIES) continue;
        }
        throw new Error(
          `Gemini request failed${status != null ? ` (HTTP ${status})` : ""}. ${err.message}`,
        );
      }
      // Parse error, schema error, blocked text(), etc. — not retryable
      console.error(
        `[llm-detector] Non-HTTP error (attempt ${attempt + 1}): ${lastError.message}`,
      );
      throw lastError;
    }
  }

  throw lastError ?? new Error("LLM call failed after all retries.");
}

// —— Public API ——

export interface LlmDetectionResult {
  components: DetectedComponent[];
  fallbackUsed: boolean;
  error?: string;
  /** The model that actually ran — may differ from config.model when we auto-substituted. */
  modelUsed?: string;
  /** Informational notice (e.g. "substituted flash because pro was 404"). */
  notice?: string;
}

export async function detectComponentsWithLlm(
  html: string,
  baseUrl: string,
  config: LlmConfig,
): Promise<LlmDetectionResult> {
  console.log(`[llm-detector] Mode=llm  url=${baseUrl}`);

  // Gate check — validates key, content size, model, and deduplication.
  const gate = await runGateCheck(html, config, baseUrl, "llm");
  if (!gate.pass) {
    console.log(`[llm-detector] Gate rejected: ${gate.reason}`);
    return { components: [], fallbackUsed: true, error: gate.reason };
  }
  const effectiveConfig: LlmConfig = gate.resolvedModel
    ? { ...config, model: gate.resolvedModel }
    : config;

  if (gate.cacheHit) {
    return {
      components: gate.cachedComponents!,
      fallbackUsed: false,
      modelUsed: effectiveConfig.model,
      notice: gate.notice,
    };
  }

  const stripped = stripHtml(html);
  try {
    const components = await callGemini(
      effectiveConfig,
      buildDetectPrompt(stripped, baseUrl),
    );
    cacheResult(baseUrl, effectiveConfig.model, "llm", components);
    console.log(
      `[llm-detector] LLM detection succeeded: ${components.length} components`,
    );
    return {
      components,
      fallbackUsed: false,
      modelUsed: effectiveConfig.model,
      notice: gate.notice,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "LLM detection failed.";
    console.error(
      `[llm-detector] LLM detection failed after all retries: ${error}`,
    );
    return { components: [], fallbackUsed: false, error };
  }
}

export async function detectComponentsHybrid(
  html: string,
  baseUrl: string,
  heuristicComponents: DetectedComponent[],
  config: LlmConfig,
): Promise<LlmDetectionResult> {
  console.log(
    `[llm-detector] Mode=hybrid  url=${baseUrl}  heuristic=${heuristicComponents.length} components`,
  );

  const gate = await runGateCheck(html, config, baseUrl, "hybrid");
  if (!gate.pass) {
    console.log(`[llm-detector] Gate rejected: ${gate.reason}`);
    return { components: heuristicComponents, fallbackUsed: true, error: gate.reason };
  }
  const effectiveConfig: LlmConfig = gate.resolvedModel
    ? { ...config, model: gate.resolvedModel }
    : config;

  if (gate.cacheHit) {
    return {
      components: gate.cachedComponents!,
      fallbackUsed: false,
      modelUsed: effectiveConfig.model,
      notice: gate.notice,
    };
  }

  const stripped = stripHtml(html);
  try {
    const components = await callGemini(
      effectiveConfig,
      buildHybridPrompt(stripped, baseUrl, heuristicComponents),
    );
    cacheResult(baseUrl, effectiveConfig.model, "hybrid", components);
    console.log(
      `[llm-detector] Hybrid refinement succeeded: ${components.length} components`,
    );
    return {
      components,
      fallbackUsed: false,
      modelUsed: effectiveConfig.model,
      notice: gate.notice,
    };
  } catch (err) {
    const error =
      err instanceof Error ? err.message : "LLM refinement failed.";
    console.error(
      `[llm-detector] Hybrid refinement failed after all retries: ${error}`,
    );
    return { components: heuristicComponents, fallbackUsed: true, error };
  }
}

// Verify an API key cheaply (model list — no generation, no token cost).
export async function testGeminiApiKey(
  apiKey: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { timeout: 10_000 },
    );
    return { ok: true };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 400 || status === 403)
        return { ok: false, error: "Invalid API key." };
      if (status === 429)
        return { ok: false, error: "Rate limit reached — key is valid but quota exhausted." };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Connection failed.",
    };
  }
}

// —— Normalizers ——

function normalizeComponent(
  raw: unknown,
  index: number,
): DetectedComponent | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;

  const kind: ComponentKind = VALID_KINDS.includes(c.kind as ComponentKind)
    ? (c.kind as ComponentKind)
    : "rich_text";
  const id =
    typeof c.id === "string" ? c.id : `c_${index + 1}_${kind}`;
  const name = typeof c.name === "string" ? c.name : kind;
  const suggestedUid =
    typeof c.suggestedUid === "string" ? c.suggestedUid.slice(0, 40) : kind;
  const confidence =
    typeof c.confidence === "number"
      ? Math.min(0.99, Math.max(0.35, c.confidence))
      : 0.7;
  const preview =
    typeof c.preview === "string" ? c.preview.slice(0, 160) : "";
  const selector =
    typeof c.selector === "string" ? c.selector : "section";
  const fields = Array.isArray(c.fields)
    ? c.fields
        .map(normalizeField)
        .filter((f): f is DetectedField => f !== null)
    : [];

  if (!fields.length) return null;
  return { id, kind, name, suggestedUid, confidence, preview, selector, fields };
}

function normalizeField(raw: unknown): DetectedField | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Record<string, unknown>;

  const type: FieldType = VALID_FIELD_TYPES.includes(f.type as FieldType)
    ? (f.type as FieldType)
    : "single_line";
  const uid = typeof f.uid === "string" ? f.uid : "field";
  const displayName =
    typeof f.displayName === "string" ? f.displayName : uid;

  const out: DetectedField = { uid, displayName, type, value: f.value ?? "" };
  if (f.required === true) out.required = true;
  if (Array.isArray(f.itemSchema)) {
    out.itemSchema = f.itemSchema
      .map(normalizeField)
      .filter((x): x is DetectedField => x !== null);
  }
  if (typeof f.assetUrl === "string") out.assetUrl = f.assetUrl;
  return out;
}