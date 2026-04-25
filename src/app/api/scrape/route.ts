import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import { detectComponents } from "@/lib/detector";
import {
  detectComponentsWithLlm,
  detectComponentsHybrid,
} from "@/lib/llm-detector";
import {
  isScrapeLlmReady,
  materializeLlmConfigForRequest,
} from "@/lib/llm-config";
import type {
  DetectedComponent,
  DetectionMode,
  LlmConfig,
  ScrapeRequest,
  ScrapeResponse,
} from "@/types";

export const runtime = "nodejs";

// —— helpers ——

async function fetchPage(
  url: string,
): Promise<{ html: string; title: string | undefined }> {
  const res = await axios.get<string>(url, {
    timeout: 20_000,
    responseType: "text",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MigrateXBot/0.1; +https://migratex.dev)",
      Accept: "text/html,application/xhtml+xml",
    },
    maxRedirects: 5,
  });
  const html = res.data as string;
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim() || undefined;
  return { html, title };
}

interface DetectResult {
  components: DetectedComponent[];
  detectionMethod: string;
  modelUsed?: string;
  llmWarning?: string;
}

async function detectPage(
  html: string,
  url: string,
  mode: DetectionMode,
  llm: LlmConfig | undefined,
  llmReady: boolean,
): Promise<DetectResult> {
  // LLM-only
  if (mode === "llm" && llmReady && llm) {
    const result = await detectComponentsWithLlm(html, url, llm);
    if (result.error && !result.components.length) {
      console.warn(`[scrape] LLM failed, falling back to heuristic. Error: ${result.error}`);
      return {
        components: detectComponents(html, url),
        detectionMethod: "heuristic_fallback",
        llmWarning: result.error,
      };
    }
    return {
      components: result.components,
      detectionMethod: "llm",
      modelUsed: result.modelUsed,
      llmWarning: result.notice ?? result.error,
    };
  }

  // Hybrid
  if (mode === "hybrid" && llmReady && llm) {
    const heuristicComponents = detectComponents(html, url);
    const result = await detectComponentsHybrid(html, url, heuristicComponents, llm);
    return {
      components: result.components,
      detectionMethod: result.fallbackUsed ? "heuristic_fallback" : "hybrid",
      modelUsed: result.modelUsed,
      llmWarning: result.notice ?? result.error,
    };
  }

  // Heuristic (default or fallback when LLM not ready)
  const components = detectComponents(html, url);
  const detectionMethod =
    (mode === "llm" || mode === "hybrid") && !llmReady
      ? "heuristic_fallback"
      : "heuristic";
  const llmWarning =
    (mode === "llm" || mode === "hybrid") && !llmReady
      ? "AI detection requires a verified API key. Using heuristics instead."
      : undefined;
  return { components, detectionMethod, llmWarning };
}

// —— route ——

export async function POST(request: Request) {
  let body: ScrapeRequest;
  try {
    body = (await request.json()) as ScrapeRequest;
  } catch {
    return NextResponse.json<ScrapeResponse>(
      { ok: false, url: "", components: [], error: "invalid_json" },
      { status: 400 },
    );
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json<ScrapeResponse>(
      { ok: false, url: "", components: [], error: "missing_url" },
      { status: 400 },
    );
  }

  const mode = body.detectionMode ?? "heuristic";
  const rawLlm = body.llmConfig;
  const llmReady = isScrapeLlmReady(rawLlm);
  const llm =
    rawLlm && rawLlm.enabled && llmReady
      ? materializeLlmConfigForRequest(rawLlm)
      : undefined;

  // ——— Multi-URL mode ———
  const urlMode = body.urlMode ?? "single";
  const allUrls =
    urlMode === "multi" &&
    Array.isArray(body.urls) &&
    body.urls.length > 1
      ? body.urls.map((u) => u.trim()).filter(Boolean)
      : null;

  if (allUrls && allUrls.length > 1) {
    console.log(
      `[scrape] Multi-URL mode: ${allUrls.length} URLs, mode=${mode} llmReady=${llmReady}`,
    );

    const allComponents: DetectedComponent[] = [];
    let firstTitle: string | undefined;
    let firstDetectResult: DetectResult | null = null;

    // — First URL: full detection (LLM/heuristic per mode) —
    try {
      const { html, title } = await fetchPage(allUrls[0]);
      firstTitle = title;
      firstDetectResult = await detectPage(html, allUrls[0], mode, llm, llmReady);
      console.log(
        `[scrape] URL 1/${allUrls.length} (${allUrls[0]}): ${firstDetectResult.components.length} components via ${firstDetectResult.detectionMethod}`,
      );
      const tagged = firstDetectResult.components.map((c) => ({
        ...c,
        id: `u0_${c.id}`,
        sourceUrlIndex: 0,
      }));
      allComponents.push(...tagged);
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.message
          ? err.message
          : err instanceof Error
            ? err.message
            : "scrape_failed";
      return NextResponse.json<ScrapeResponse>(
        { ok: false, url, components: [], error: `First URL failed: ${message}` },
        { status: 502 },
      );
    }

    // — Remaining URLs: always heuristic —
    for (let i = 1; i < allUrls.length; i++) {
      try {
        const { html } = await fetchPage(allUrls[i]);
        const components = detectComponents(html, allUrls[i]);
        console.log(
          `[scrape] URL ${i + 1}/${allUrls.length} (${allUrls[i]}): ${components.length} components via heuristic`,
        );
        const tagged = components.map((c) => ({
          ...c,
          id: `u${i}_${c.id}`,
          sourceUrlIndex: i,
        }));
        allComponents.push(...tagged);
      } catch (err) {
        // Non-fatal: skip failed URLs but log
        console.warn(
          `[scrape] URL ${i + 1}/${allUrls.length} (${allUrls[i]}) failed: ${
            err instanceof Error ? err.message : String(err)
          } — skipping`,
        );
      }
    }

    return NextResponse.json<ScrapeResponse>({
      ok: true,
      url: allUrls[0],
      title: firstTitle,
      components: allComponents,
      detectionMethod: firstDetectResult.detectionMethod,
      ...(firstDetectResult.modelUsed ? { modelUsed: firstDetectResult.modelUsed } : {}),
      ...(firstDetectResult.llmWarning ? { llmWarning: firstDetectResult.llmWarning } : {}),
      multiUrlCount: allUrls.length,
    });
  }

  // ——— Single URL mode (original behaviour) ———
  try {
    const { html, title } = await fetchPage(url);

    console.log(
      `[scrape] url=${url} mode=${mode} llmReady=${llmReady} htmlSize=${html.length}`,
    );

    const result = await detectPage(html, url, mode, llm, llmReady);
    console.log(
      `[scrape] ${result.detectionMethod}: ${result.components.length} components`,
    );

    return NextResponse.json<ScrapeResponse>({
      ok: true,
      url,
      title,
      components: result.components,
      detectionMethod: result.detectionMethod,
      ...(result.modelUsed ? { modelUsed: result.modelUsed } : {}),
      ...(result.llmWarning ? { llmWarning: result.llmWarning } : {}),
    });
  } catch (err) {
    const message =
      axios.isAxiosError(err) && err.message
        ? err.message
        : err instanceof Error
          ? err.message
          : "scrape_failed";
    return NextResponse.json<ScrapeResponse>(
      { ok: false, url, components: [], error: message },
      { status: 502 },
    );
  }
}
