import { NextResponse } from "next/server";
import axios from "axios";

export const runtime = "nodejs";

const ANTHROPIC_VERSION = "2023-06-01";

interface AnthropicModelRow {
  id: string;
  display_name?: string;
  max_input_tokens?: number;
}

export interface AnthropicModelsResponse {
  ok: boolean;
  models?: Array<{ value: string; label: string }>;
  error?: string;
}

function anthropicHeaders(apiKey: string): Record<string, string> {
  return {
    "x-api-key": apiKey,
    "anthropic-version": ANTHROPIC_VERSION,
  };
}

/** Prefer Sonnet-class, then Opus, Haiku, then any Claude Messages model. */
function sortClaudeModels(a: string, b: string): number {
  const tier = (id: string) => {
    const u = id.toLowerCase();
    if (u.includes("haiku")) return 2;
    if (u.includes("opus")) return 1;
    if (u.includes("sonnet")) return 0;
    return 3;
  };
  const d = tier(a) - tier(b);
  if (d !== 0) return d;
  return a.localeCompare(b);
}

export async function POST(request: Request) {
  let apiKey: string;
  try {
    const body = (await request.json()) as { apiKey?: string };
    apiKey = body.apiKey?.trim() ?? "";
  } catch {
    return NextResponse.json<AnthropicModelsResponse>(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  if (!apiKey) {
    return NextResponse.json<AnthropicModelsResponse>(
      { ok: false, error: "Missing API key." },
      { status: 400 },
    );
  }

  try {
    const res = await axios.get<{
      data: AnthropicModelRow[];
      has_more?: boolean;
    }>("https://api.anthropic.com/v1/models?limit=100", {
      headers: anthropicHeaders(apiKey),
      timeout: 15_000,
    });

    const rows = res.data.data ?? [];
    const claudeIds = rows
      .map((r) => r.id)
      .filter((id) => typeof id === "string" && id.startsWith("claude-"))
      .sort(sortClaudeModels);

    const byId = new Map(rows.map((r) => [r.id, r]));

    const models = claudeIds.map((value) => {
      const row = byId.get(value);
      const ctx = row?.max_input_tokens;
      const ctxStr = ctx
        ? ctx >= 1_000_000
          ? "1M ctx"
          : `${Math.round(ctx / 1000)}K ctx`
        : null;
      const base =
        row?.display_name && row.display_name !== value
          ? row.display_name
          : value;
      const label = ctxStr ? `${base} — ${ctxStr}` : base;
      return { value, label };
    });

    if (!models.length) {
      return NextResponse.json<AnthropicModelsResponse>({
        ok: false,
        error:
          "No Claude models returned for this key. Check billing and API access.",
      });
    }

    console.log(
      `[anthropic/models] Found ${models.length} Claude models for key …${apiKey.slice(-6)}`,
    );

    return NextResponse.json<AnthropicModelsResponse>({ ok: true, models });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const body = JSON.stringify(err.response?.data ?? {}).slice(0, 200);

      if (status === 401 || status === 403) {
        console.warn(`[anthropic/models] Invalid key (${status}): ${body}`);
        return NextResponse.json<AnthropicModelsResponse>({
          ok: false,
          error: "API key is invalid or does not have permission to list models.",
        });
      }
      if (status === 429) {
        console.warn(`[anthropic/models] Rate limited (429)`);
        return NextResponse.json<AnthropicModelsResponse>({
          ok: false,
          error: "Rate limited — wait a moment and try again.",
        });
      }
      console.error(`[anthropic/models] HTTP ${status}: ${body}`);
      return NextResponse.json<AnthropicModelsResponse>({
        ok: false,
        error: `Anthropic API error (${status ?? "network"}): ${body}`,
      });
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[anthropic/models] ${message}`);
    return NextResponse.json<AnthropicModelsResponse>({
      ok: false,
      error: message,
    });
  }
}
