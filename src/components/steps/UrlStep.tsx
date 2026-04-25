"use client";

import { useState, useId } from "react";
import { ScanLine, AlertCircle, Bot, Cpu, Blend, Settings2 } from "lucide-react";
import { useStackshift } from "@/store";
import type { DetectionMode, ScrapeResponse } from "@/types";
import {
  btnPrimary,
  cardStatic,
  inputLg,
  labelMono,
  stepEyebrow,
  stepLead,
  stepTitle,
} from "@/lib/ui";

const MODE_OPTIONS: {
  mode: DetectionMode;
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    mode: "heuristic",
    label: "Heuristic",
    desc: "Fast · deterministic · no API cost",
    icon: <Cpu size={14} strokeWidth={2} />,
  },
  {
    mode: "llm",
    label: "AI",
    desc: "Semantic · Gemini-powered · per-request cost",
    icon: <Bot size={14} strokeWidth={2} />,
  },
  {
    mode: "hybrid",
    label: "Hybrid",
    desc: "Heuristic baseline + AI refinement",
    icon: <Blend size={14} strokeWidth={2} />,
  },
];

export default function UrlStep() {
  const url = useStackshift((s) => s.url);
  const dryRun = useStackshift((s) => s.dryRun);
  const uploadAssets = useStackshift((s) => s.uploadAssets);
  const detectionMode = useStackshift((s) => s.detectionMode);
  const llmConfig = useStackshift((s) => s.llmConfig);
  const setLlmConfig = useStackshift((s) => s.setLlmConfig);
  const setUrl = useStackshift((s) => s.setUrl);
  const setDryRun = useStackshift((s) => s.setDryRun);
  const setUploadAssets = useStackshift((s) => s.setUploadAssets);
  const setDetectionMode = useStackshift((s) => s.setDetectionMode);
  const setComponents = useStackshift((s) => s.setComponents);
  const setDetectionMethod = useStackshift((s) => s.setDetectionMethod);
  const setStep = useStackshift((s) => s.setStep);
  const setLlmPanelOpen = useStackshift((s) => s.setLlmPanelOpen);

  const urlFieldId = useId();
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  const llmReady = llmConfig.enabled && !!llmConfig.apiKey.trim();
  const needsLlm = detectionMode === "llm" || detectionMode === "hybrid";

  const handleScan = async () => {
    setErr(null);
    setWarn(null);
    if (!url.trim()) {
      setErr("Enter a URL first.");
      return;
    }
    setScanning(true);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          detectionMode,
          llmConfig: llmReady ? llmConfig : undefined,
        }),
      });
      const data = (await res.json()) as ScrapeResponse;
      if (!data.ok) {
        setErr(data.error ?? "Scan failed.");
        return;
      }
      if (!data.components.length) {
        setErr("No components detected. Try a more content-rich URL.");
        return;
      }
      if (data.modelUsed && data.modelUsed !== llmConfig.model) {
        setLlmConfig({ model: data.modelUsed });
      }
      if (data.llmWarning) setWarn(data.llmWarning);
      setDetectionMethod(data.detectionMethod ?? "heuristic");
      setComponents(data.components);
      setStep("detect");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <>
      <header className="mb-6 sm:mb-8">
        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <span className={stepEyebrow}>URL</span>
        </div>
        <h2 className={stepTitle}>
          Paste a URL — we&apos;ll{" "}
          <span className="text-accent">map the page</span>.
        </h2>
        <p className={`${stepLead} mt-3 max-w-[42rem]`}>
          Any public webpage. We fetch HTML server-side, then detect reusable
          blocks — heroes, card grids, FAQs, testimonials.
        </p>
      </header>

      <div className={`${cardStatic} transition-shadow duration-200 hover:shadow-card-lg`}>
        <div className="flex items-center gap-2 border-b border-line bg-paper-2/80 px-3 py-2.5 sm:px-4">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#ff5f57]"
            aria-hidden
          />
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#febc2e]"
            aria-hidden
          />
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#28c840]"
            aria-hidden
          />
          <span className="ml-2 min-w-0 flex-1 truncate rounded-md border border-line bg-card px-2.5 py-1 font-mono text-[11px] text-muted">
            {url || "https://…"}
          </span>
        </div>

        <div className="p-6 sm:p-8">
          <label htmlFor={urlFieldId} className={labelMono}>
            URL to migrate
          </label>
          <input
            id={urlFieldId}
            className={inputLg}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.example.com/pricing"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !scanning) void handleScan();
            }}
            spellCheck={false}
            autoComplete="url"
            aria-invalid={!!err}
            aria-describedby={err ? "url-step-error" : undefined}
          />

          <div className="mt-6">
            <div className={`${labelMono} mb-3`}>Detection mode</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {MODE_OPTIONS.map(({ mode, label, desc, icon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDetectionMode(mode)}
                  className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors duration-150 ${
                    detectionMode === mode
                      ? "border-accent bg-accent-muted text-ink ring-1 ring-accent/15"
                      : "border-line bg-paper text-ink hover:border-line-strong hover:bg-card"
                  }`}
                >
                  <span className="mt-0.5 shrink-0 text-muted">{icon}</span>
                  <div>
                    <div className="text-sm font-semibold leading-snug">
                      {label}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] leading-relaxed text-muted">
                      {desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {needsLlm && !llmReady && (
              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-accent/25 bg-accent-muted/50 px-4 py-3 sm:flex-row sm:items-center">
                <AlertCircle
                  size={16}
                  className="shrink-0 text-accent"
                  aria-hidden
                />
                <p className="flex-1 text-sm text-ink">
                  AI detection requires a Gemini API key.
                </p>
                <button
                  type="button"
                  onClick={() => setLlmPanelOpen(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/30 bg-card px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wide text-accent transition-colors hover:bg-accent hover:text-white"
                >
                  <Settings2 size={12} /> Configure AI
                </button>
              </div>
            )}
            {needsLlm && llmReady && (
              <div className="mt-4 flex flex-col gap-2 rounded-lg border border-emerald-200 bg-green-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Bot
                    size={14}
                    className="shrink-0 text-brand-green"
                    aria-hidden
                  />
                  <span className="text-sm text-ink">
                    Gemini{" "}
                    <code className="rounded bg-green-soft px-1 font-mono text-xs">
                      {llmConfig.model}
                    </code>{" "}
                    ready
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setLlmPanelOpen(true)}
                  className="self-start text-xs font-medium text-accent hover:underline sm:self-auto"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <Checkbox checked={dryRun} onChange={() => setDryRun(!dryRun)}>
              Dry-run mode{" "}
              <span className="font-mono text-[11px] font-normal uppercase tracking-wide text-muted">
                — preview JSON, don&apos;t push
              </span>
            </Checkbox>
            <Checkbox
              checked={uploadAssets}
              onChange={() => setUploadAssets(!uploadAssets)}
            >
              Upload images as assets
            </Checkbox>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              className={btnPrimary}
              onClick={() => void handleScan()}
              disabled={scanning || !url.trim()}
            >
              {scanning ? (
                <>
                  <span className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {detectionMode === "heuristic"
                    ? "Scanning…"
                    : "Detecting with AI…"}
                </>
              ) : (
                <>
                  <ScanLine size={16} strokeWidth={2} /> Scan page
                </>
              )}
            </button>
            {warn && (
              <span className="inline-flex items-center gap-1.5 text-sm text-brand-yellow">
                <AlertCircle size={14} aria-hidden /> {warn}
              </span>
            )}
            {err && (
              <span
                id="url-step-error"
                className="inline-flex items-center gap-1.5 text-sm text-brand-red"
                role="alert"
              >
                <AlertCircle size={14} aria-hidden /> {err}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="inline-flex cursor-pointer items-start gap-3 text-sm leading-snug text-ink"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={() => onChange()}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-accent focus:ring-2 focus:ring-accent/30"
      />
      <span>{children}</span>
    </label>
  );
}
