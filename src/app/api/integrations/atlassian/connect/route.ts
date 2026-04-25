import { NextResponse } from "next/server";
import { fetchConfluenceSpaces, fetchJiraProjects } from "@/lib/atlassian";
import type {
  AtlassianConnectRequest,
  AtlassianConnectResponse,
} from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as AtlassianConnectRequest;
  const config = body?.config;

  if (
    !config?.siteUrl?.trim() ||
    !config?.email?.trim() ||
    !config?.apiToken?.trim()
  ) {
    return NextResponse.json<AtlassianConnectResponse>(
      {
        ok: false,
        jiraProjects: [],
        confluenceSpaces: [],
        error: "missing_credentials",
      },
      { status: 400 },
    );
  }

  if (!body.includeJira && !body.includeConfluence) {
    return NextResponse.json<AtlassianConnectResponse>(
      {
        ok: false,
        jiraProjects: [],
        confluenceSpaces: [],
        error: "select_at_least_one_target",
      },
      { status: 400 },
    );
  }

  try {
    const [jiraProjects, confluenceSpaces] = await Promise.all([
      body.includeJira ? fetchJiraProjects(config) : Promise.resolve([]),
      body.includeConfluence ? fetchConfluenceSpaces(config) : Promise.resolve([]),
    ]);

    return NextResponse.json<AtlassianConnectResponse>({
      ok: true,
      jiraProjects,
      confluenceSpaces,
    });
  } catch (err) {
    return NextResponse.json<AtlassianConnectResponse>(
      {
        ok: false,
        jiraProjects: [],
        confluenceSpaces: [],
        error: err instanceof Error ? err.message : "connection_failed",
      },
      { status: 401 },
    );
  }
}
