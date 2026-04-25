// ——————————————————————————————————————
//  MigrateX — shared LLM config, env resolution, validation
// ——————————————————————————————————————

import type { DetectedComponent, LlmConfig, LlmProvider } from "@/types";
import { DEFAULT_CLAUDE_MODEL, DEFAULT_GROQ_MODEL, GEMINI_MODELS } from "@/types";

export type LlmKeyRole = "primary" | "fallback";

/** API key from client first; otherwise optional server env per provider. */
export function resolveLlmApiKey(
  provider: LlmProvider,
  explicitKey: string,
  role: LlmKeyRole,
): string {
  const trimmed = explicitKey.trim();
  if (trimmed) return trimmed;

  const env =
    role === "primary"
      ? {
          groq: process.env.GROQ_API_KEY,
          gemini: process.env.GEMINI_API_KEY,
          anthropic: process.env.ANTHROPIC_API_KEY,
        }
      : {
          groq: process.env.GROQ_API_KEY,
          gemini: process.env.GEMINI_API_KEY,
          anthropic: process.env.ANTHROPIC_API_KEY,
        };

  const v = env[provider]?.trim() ?? "";
  return v;
}

export function defaultModelForProvider(provider: LlmProvider): string {
  switch (provider) {
    case "anthropic":
      return DEFAULT_CLAUDE_MODEL;
    case "groq":
      return DEFAULT_GROQ_MODEL;
    default:
      return GEMINI_MODELS[0].value;
  }
}

/** Merge env-backed keys so gate + provider calls see real credentials (server only). */
export function materializeLlmConfigForRequest(config: LlmConfig): LlmConfig {
  return {
    ...config,
    apiKey: resolveLlmApiKey(config.provider, config.apiKey, "primary"),
  };
}

export function primaryApiKey(config: LlmConfig): string {
  return resolveLlmApiKey(config.provider, config.apiKey, "primary");
}

export function fallbackApiKeyForProvider(
  config: LlmConfig,
  fallbackProvider: LlmProvider,
): string {
  return resolveLlmApiKey(
    fallbackProvider,
    config.fallbackApiKey ?? "",
    "fallback",
  );
}

/**
 * Build a single-provider config for the backup chain.
 * Returns null when unset, same as primary, or no resolvable API key.
 */
export function buildFallbackLlmConfig(primary: LlmConfig): LlmConfig | null {
  const fp = primary.fallbackProvider;
  if (!fp || fp === primary.provider) return null;
  const apiKey = fallbackApiKeyForProvider(primary, fp);
  if (!apiKey.trim()) return null;
  const model =
    primary.fallbackModel?.trim() || defaultModelForProvider(fp);
  return {
    provider: fp,
    apiKey,
    model,
    enabled: true,
  };
}

/**
 * True when AI detection can run on the server.
 * `primaryApiKey` already resolves from env vars server-side, so a non-empty
 * resolved key is sufficient — the client cannot see server env vars and may
 * have sent `enabled: false` even when a valid server key exists.
 */
export function isScrapeLlmReady(config?: LlmConfig): boolean {
  if (!config) return false;
  return !!primaryApiKey(config).trim();
}

/**
 * Final pass: drop invalid rows and duplicate ids after provider-specific parsing.
 * All LLM paths should return through this for consistent downstream shape.
 */
export function validateDetectedComponents(
  components: DetectedComponent[],
): DetectedComponent[] {
  const seen = new Set<string>();
  return components.filter((c) => {
    if (!c.id || !Array.isArray(c.fields) || c.fields.length === 0)
      return false;
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}
