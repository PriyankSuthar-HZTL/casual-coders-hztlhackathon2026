import { NextResponse } from "next/server";
import { buildPerComponentIntegrationDrafts } from "@/lib/atlassian";
import { generateAllComponentSpecs } from "@/lib/llm-spec-generator";
import { isScrapeLlmReady, materializeLlmConfigForRequest } from "@/lib/llm-config";
import type {
  IntegrationGenerateRequest,
  IntegrationGenerateResponse,
} from "@/types";

export const runtime = "nodejs";

// Placeholder placed in the Jira description when a Confluence page will be
// created alongside the ticket. The submit step replaces the whole description
// with the real Confluence URL, so this is never user-visible in practice.
const CONFLUENCE_LINK_PENDING =
  "Confluence documentation: (link will be added after sync)";

export async function POST(request: Request) {
  const body = (await request.json()) as IntegrationGenerateRequest;
  if (!body?.url?.trim() || !Array.isArray(body.components)) {
    return NextResponse.json<IntegrationGenerateResponse>(
      { ok: false, error: "missing_generation_input" },
      { status: 400 },
    );
  }

  // Build baseline drafts (template-based). These are always generated so
  // that callers have a working fallback even when LLM generation is skipped.
  const componentDrafts = buildPerComponentIntegrationDrafts({
    url: body.url,
    components: body.components,
  });

  // —— LLM-powered Confluence spec generation ——
  const rawLlmConfig = body.llmConfig;
  const llmReady = isScrapeLlmReady(rawLlmConfig);

  if (llmReady && rawLlmConfig) {
    const llmConfig = materializeLlmConfigForRequest(rawLlmConfig);

    console.log(
      `[integrations/generate] LLM spec generation: provider=${llmConfig.provider} model=${llmConfig.model} components=${body.components.length}`,
    );

    // Generate specs sequentially to respect per-provider rate limits.
    const specMap = await generateAllComponentSpecs(
      body.components,
      body.url,
      llmConfig,
    );

    // Merge LLM-generated Confluence content into drafts.
    // Jira description is reduced to a Confluence link placeholder — the real
    // URL is injected in the submit step once the page is created.
    for (const draft of componentDrafts) {
      const llmSpec = specMap.get(draft.componentId);
      if (llmSpec) {
        draft.confluenceDraft.content = llmSpec;
        // Jira ticket should only contain the Confluence page link.
        draft.jiraDraft.description = CONFLUENCE_LINK_PENDING;
      }
    }

    console.log(
      `[integrations/generate] LLM specs applied: ${specMap.size}/${componentDrafts.length} components`,
    );
  } else {
    console.log(
      `[integrations/generate] LLM not ready — using template-based drafts (llmReady=${llmReady})`,
    );
  }

  return NextResponse.json<IntegrationGenerateResponse>({
    ok: true,
    componentDrafts,
  });
}
