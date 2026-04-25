import { NextResponse } from "next/server";
import { listContentTypes, matchComponent } from "@/lib/contentstack";
import type { MatchRequest, MatchResponse } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as MatchRequest;

  if (!body?.config?.apiKey) {
    return NextResponse.json<MatchResponse>(
      { ok: false, matches: [], error: "missing_credentials" },
      { status: 400 },
    );
  }

  try {
    const existing = await listContentTypes(body.config);
    const matches = body.components.map((c) => matchComponent(c, existing));
    return NextResponse.json<MatchResponse>({ ok: true, matches });
  } catch (err) {
    return NextResponse.json<MatchResponse>(
      {
        ok: false,
        matches: [],
        error: err instanceof Error ? err.message : "match_failed",
      },
      { status: 502 },
    );
  }
}
