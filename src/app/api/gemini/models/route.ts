import { NextResponse } from "next/server";
import axios from "axios";

export const runtime = "nodejs";

// Shape returned by the Gemini models list API.
interface GeminiModelEntry {
  name: string;                            // "models/gemini-1.5-flash"
  displayName: string;                     // "Gemini 1.5 Flash"
  description?: string;
  supportedGenerationMethods?: string[];
  inputTokenLimit?: number;
  outputTokenLimit?: number;
}

export interface GeminiModelsResponse {
  ok: boolean;
  models?: Array<{ value: string; label: string }>;
  error?: string;
}

export async function POST(request: Request) {
  let apiKey: string;
  try {
    const body = (await request.json()) as { apiKey?: string };
    apiKey = body.apiKey?.trim() ?? "";
  } catch {
    return NextResponse.json<GeminiModelsResponse>(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  if (!apiKey) {
    return NextResponse.json<GeminiModelsResponse>(
      { ok: false, error: "Missing API key." },
      { status: 400 },
    );
  }

  try {
    const res = await axios.get<{ models: GeminiModelEntry[] }>(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { timeout: 15_000 },
    );

    const raw = res.data.models ?? [];

    const models = raw
      // Only models that can generate content (not embeddings, AQA, etc.)
      .filter(
        (m) =>
          m.supportedGenerationMethods?.includes("generateContent") &&
          m.name.startsWith("models/gemini"),
      )
      .map((m) => {
        // "models/gemini-1.5-flash-001" → "gemini-1.5-flash-001"
        const value = m.name.replace(/^models\//, "");
        const ctx = m.inputTokenLimit;
        const ctxStr = ctx
          ? ctx >= 1_000_000
            ? "1M ctx"
            : `${Math.round(ctx / 1000)}K ctx`
          : null;
        const label = ctxStr
          ? `${m.displayName} — ${ctxStr}`
          : m.displayName;
        return { value, label };
      })
      // Flash first, then Pro, then anything else; within each group keep API order.
      .sort((a, b) => {
        const tier = (v: string) =>
          v.includes("flash") ? 0 : v.includes("pro") ? 1 : 2;
        return tier(a.value) - tier(b.value);
      });

    console.log(
      `[gemini/models] Found ${models.length} generateContent-capable models for key …${apiKey.slice(-6)}`,
    );

    return NextResponse.json<GeminiModelsResponse>({ ok: true, models });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const body = JSON.stringify(err.response?.data ?? {}).slice(0, 200);

      if (status === 400 || status === 403) {
        console.warn(`[gemini/models] Invalid key (${status}): ${body}`);
        return NextResponse.json<GeminiModelsResponse>({
          ok: false,
          error: "API key is invalid or does not have permission to list models.",
        });
      }
      if (status === 429) {
        console.warn(`[gemini/models] Rate limited (429)`);
        return NextResponse.json<GeminiModelsResponse>({
          ok: false,
          error: "Rate limited — wait a moment and try again.",
        });
      }
      console.error(`[gemini/models] HTTP ${status}: ${body}`);
      return NextResponse.json<GeminiModelsResponse>({
        ok: false,
        error: `Gemini API error (${status ?? "network"}): ${body}`,
      });
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[gemini/models] ${message}`);
    return NextResponse.json<GeminiModelsResponse>({
      ok: false,
      error: message,
    });
  }
}
