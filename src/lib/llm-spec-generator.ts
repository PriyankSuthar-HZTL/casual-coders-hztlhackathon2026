// ——————————————————————————————————————
//  MigrateX — LLM-based functional spec generator
//  Generates a Confluence functional specification document for each detected
//  component. Follows the same rate-limit / retry pattern as llm-detector.ts.
//  Provider support: Gemini (SDK), Anthropic & Groq (REST fetch).
// ——————————————————————————————————————

import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  GoogleGenerativeAIResponseError,
} from "@google/generative-ai";
import type { DetectedComponent, LlmConfig } from "@/types";

// —— Constants ——

const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 3_000;

// —— Helpers ——

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function fieldValuePreview(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 160 ? `${t.slice(0, 160)}…` : t || "—";
  }
  if (typeof value === "object") {
    try {
      const s = JSON.stringify(value);
      return s.length > 160 ? `${s.slice(0, 160)}…` : s;
    } catch {
      return "[object]";
    }
  }
  return String(value);
}

// —— Prompt builder ——

function buildSpecPrompt(
  component: DetectedComponent,
  sourceUrl: string,
  allComponents: DetectedComponent[],
): string {
  const peers = allComponents
    .filter((c) => c.id !== component.id)
    .map((c) => `- ${c.name} (kind: ${c.kind}, selector: ${c.selector})`)
    .join("\n");

  const fieldsSection = component.fields
    .map((f) => {
      const req = f.required ? "required" : "optional";
      const sample = fieldValuePreview(f.value);
      const schema = f.itemSchema?.length
        ? `\n    Item schema: ${f.itemSchema.map((i) => `${i.uid}:${i.type}`).join(", ")}`
        : "";
      return `  - **${f.displayName}** (uid: \`${f.uid}\`, type: \`${f.type}\`, ${req})\n    Sample value: ${sample}${schema}`;
    })
    .join("\n");

  return `You are a technical writer creating a functional specification document for a web component detected on ${sourceUrl}.

## Component Details
- Name: ${component.name}
- Kind: ${component.kind}
- CSS Selector: \`${component.selector}\`
- Detection Confidence: ${Math.round(component.confidence * 100)}%
- Suggested Contentstack UID: \`${component.suggestedUid}\`
- Preview: ${component.preview || "N/A"}

## Detected Fields
${fieldsSection}

${peers ? `## Other Components on This Page\n${peers}` : ""}

Write a detailed functional specification document in Markdown. Include all of the following sections exactly as named:

# Overview
One paragraph describing what this component is, its purpose on the page, and the content it delivers to end users.

# Functional Description
How the component works, what it displays, and its role in the overall page layout and user journey.

# Content Fields
For each detected field, provide: field name, UID (code format), data type, required/optional status, a description of what the field contains, content guidelines for authors, and the sample value detected.

# Content Guidelines
Bullet-point rules and best practices for content authors when populating this component in Contentstack.

# Design & Layout Notes
Observations about the visual structure and layout of this component based on its selector and kind.

# Dependencies & Relationships
${peers ? "How this component relates to the other detected components on the same page, including layout order and any shared content." : "No other components were detected on the same page alongside this component."}

# Acceptance Criteria
A numbered checklist of conditions that must be true for this component to be considered correctly implemented and migrated in Contentstack.

Rules:
- Use actual values from the component data — no placeholders.
- Keep headings exactly as shown above (# for H1 sections).
- Use **bold** for field names, \`code\` for UIDs and field types.
- Use bullet lists (-) and numbered lists (1.) where appropriate.
- Be professional, specific, and concise.
- Return ONLY the Markdown document — no preamble, no trailing notes.`;
}

// —— Provider-specific callers ——

async function callGeminiForSpec(
  config: LlmConfig,
  prompt: string,
): Promise<string> {
  const modelId = (config.model || "gemini-1.5-flash").replace(/^models\//, "");
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const generativeModel = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const waitMs = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
      console.log(`[llm-spec] Gemini retry ${attempt}/${MAX_RETRIES}: waiting ${waitMs}ms…`);
      await sleep(waitMs);
    }

    try {
      const { response } = await generativeModel.generateContent(prompt, {
        timeout: 90_000,
      });

      let text: string;
      try {
        text = response.text().trim();
      } catch (err) {
        if (err instanceof GoogleGenerativeAIResponseError) {
          throw new Error("Gemini response was blocked or empty by safety filters.");
        }
        throw err;
      }

      if (!text) throw new Error("Gemini returned an empty spec response.");
      return text;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (err instanceof GoogleGenerativeAIFetchError) {
        const status = err.status;
        if (status === 429 && attempt < MAX_RETRIES) continue;
        if (status !== undefined && status >= 500 && attempt < MAX_RETRIES) continue;
        throw new Error(
          `Gemini spec generation failed${status != null ? ` (HTTP ${status})` : ""}: ${err.message}`,
        );
      }

      // Non-retryable (parse error, safety block, etc.)
      throw lastError;
    }
  }

  throw lastError ?? new Error("Gemini spec generation failed after retries.");
}

async function callAnthropicForSpec(
  config: LlmConfig,
  prompt: string,
): Promise<string> {
  const model = config.model || "claude-sonnet-4-20250514";
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const waitMs = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
      console.log(`[llm-spec] Anthropic retry ${attempt}/${MAX_RETRIES}: waiting ${waitMs}ms…`);
      await sleep(waitMs);
    }

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          temperature: 0.3,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(90_000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const status = res.status;
        if (status === 429 && attempt < MAX_RETRIES) {
          lastError = new Error(`Anthropic rate limited (429)`);
          continue;
        }
        if (status >= 500 && attempt < MAX_RETRIES) {
          lastError = new Error(`Anthropic server error (${status})`);
          continue;
        }
        throw new Error(`Anthropic API error (HTTP ${status}): ${text.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };
      const text = data.content?.find((b) => b.type === "text")?.text?.trim() ?? "";
      if (!text) throw new Error("Anthropic returned an empty spec response.");
      return text;
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        lastError = new Error("Anthropic request timed out.");
        if (attempt < MAX_RETRIES) continue;
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      throw lastError;
    }
  }

  throw lastError ?? new Error("Anthropic spec generation failed after retries.");
}

async function callGroqForSpec(
  config: LlmConfig,
  prompt: string,
): Promise<string> {
  const model = config.model || "llama-3.3-70b-versatile";
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const waitMs = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
      console.log(`[llm-spec] Groq retry ${attempt}/${MAX_RETRIES}: waiting ${waitMs}ms…`);
      await sleep(waitMs);
    }

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content:
                "You are a technical writer creating professional functional specification documents for Confluence.",
            },
            { role: "user", content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(90_000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const status = res.status;
        if (status === 429 && attempt < MAX_RETRIES) {
          lastError = new Error(`Groq rate limited (429)`);
          continue;
        }
        if (status >= 500 && attempt < MAX_RETRIES) {
          lastError = new Error(`Groq server error (${status})`);
          continue;
        }
        throw new Error(`Groq API error (HTTP ${status}): ${text.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content?.trim() ?? "";
      if (!text) throw new Error("Groq returned an empty spec response.");
      return text;
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        lastError = new Error("Groq request timed out.");
        if (attempt < MAX_RETRIES) continue;
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      throw lastError;
    }
  }

  throw lastError ?? new Error("Groq spec generation failed after retries.");
}

// —— Public API ——

/**
 * Generate a rich Markdown functional specification for a single detected component.
 * Routes to the correct LLM provider based on config.provider.
 * Throws on unrecoverable error after retries.
 */
export async function generateComponentSpec(
  component: DetectedComponent,
  sourceUrl: string,
  allComponents: DetectedComponent[],
  config: LlmConfig,
): Promise<string> {
  const prompt = buildSpecPrompt(component, sourceUrl, allComponents);
  const provider = config.provider;

  console.log(
    `[llm-spec] Generating spec for "${component.name}" (${component.kind}) via ${provider}`,
  );

  switch (provider) {
    case "gemini":
      return callGeminiForSpec(config, prompt);
    case "anthropic":
      return callAnthropicForSpec(config, prompt);
    case "groq":
      return callGroqForSpec(config, prompt);
    default:
      // Unknown provider — fall through to Gemini as a safe default.
      console.warn(`[llm-spec] Unknown provider "${String(provider)}", falling back to Gemini.`);
      return callGeminiForSpec(config, prompt);
  }
}

/**
 * Generate specs for all components sequentially to respect provider rate limits.
 * Returns a map of componentId → Markdown spec string.
 * Individual failures are caught; the entry is omitted from the map.
 */
export async function generateAllComponentSpecs(
  components: DetectedComponent[],
  sourceUrl: string,
  config: LlmConfig,
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const component of components) {
    try {
      const spec = await generateComponentSpec(component, sourceUrl, components, config);
      results.set(component.id, spec);
      console.log(`[llm-spec] Spec ready for "${component.name}" (${component.id})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[llm-spec] Failed to generate spec for "${component.name}": ${msg}`);
    }
  }

  return results;
}
