import { NextResponse } from "next/server";
import axios from "axios";

export const runtime = "nodejs";

const GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models";

export interface GroqModelsResponse {
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
    return NextResponse.json<GroqModelsResponse>(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  if (!apiKey) {
    return NextResponse.json<GroqModelsResponse>(
      { ok: false, error: "Missing API key." },
      { status: 400 },
    );
  }

  try {
    const res = await axios.get<{
      data?: Array<{ id: string; owned_by?: string }>;
    }>(GROQ_MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 15_000,
    });

    const rows = res.data.data ?? [];
    const models = rows
      .map((m) => m.id)
      .filter((id) => typeof id === "string" && id.length > 0)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }));

    if (!models.length) {
      return NextResponse.json<GroqModelsResponse>({
        ok: false,
        error: "No models returned for this key.",
      });
    }

    console.log(
      `[groq/models] Found ${models.length} models for key …${apiKey.slice(-6)}`,
    );

    return NextResponse.json<GroqModelsResponse>({ ok: true, models });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const body = JSON.stringify(err.response?.data ?? {}).slice(0, 200);

      if (status === 401 || status === 403) {
        return NextResponse.json<GroqModelsResponse>({
          ok: false,
          error: "API key is invalid or does not have permission.",
        });
      }
      if (status === 429) {
        return NextResponse.json<GroqModelsResponse>({
          ok: false,
          error: "Rate limited — wait a moment and try again.",
        });
      }
      console.error(`[groq/models] HTTP ${status}: ${body}`);
      return NextResponse.json<GroqModelsResponse>({
        ok: false,
        error: `Groq API error (${status ?? "network"}): ${body}`,
      });
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json<GroqModelsResponse>({ ok: false, error: message });
  }
}
