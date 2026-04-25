"use client";

import { useMemo, useState, useId, useRef } from "react";
import {
  ScanLine,
  AlertCircle,
  Bot,
  Cpu,
  Blend,
  Settings2,
  Link2,
  FileText,
  Upload,
  X,
} from "lucide-react";
import { primaryApiKey } from "@/lib/llm-config";
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

export default function UrlStep() {
  const url = useStackshift((s) => s.url);
  const urlMode = useStackshift((s) => s.urlMode);
  const multiUrls = useStackshift((s) => s.multiUrls);
  const dryRun = useStackshift((s) => s.dryRun);
  const uploadAssets = useStackshift((s) => s.uploadAssets);
  const detectionMode = useStackshift((s) => s.detectionMode);
  const llmConfig = useStackshift((s) => s.llmConfig);
  const setLlmConfig = useStackshift((s) => s.setLlmConfig);
  const setUrl = useStackshift((s) => s.setUrl);
  const setUrlMode = useStackshift((s) => s.setUrlMode);
  const setMultiUrls = useStackshift((s) => s.setMultiUrls);
  const setDryRun = useStackshift((s) => s.setDryRun);
  const setUploadAssets = useStackshift((s) => s.setUploadAssets);
  const setDetectionMode = useStackshift((s) => s.setDetectionMode);
  const setComponents = useStackshift((s) => s.setComponents);
  const setDetectionMethod = useStackshift((s) => s.setDetectionMethod);
  const setStep = useStackshift((s) => s.setStep);
  const setLlmPanelOpen = useStackshift((s) => s.setLlmPanelOpen);

  const llmBrand =
    llmConfig.provider === "anthropic"
      ? "Claude"
      : llmConfig.provider === "groq"
        ? "Groq"
        : "Gemini";

  const modeOptions = useMemo(
    () =>
      [
        {
          mode: "heuristic" as const,
          label: "Heuristic",
          desc: "Fast · deterministic · no API cost",
          icon: <Cpu size={14} strokeWidth={2} />,
        },
        {
          mode: "llm" as const,
          label: "AI",
          desc: `Semantic · ${llmBrand} · per-request cost`,
          icon: <Bot size={14} strokeWidth={2} />,
        },
        {
          mode: "hybrid" as const,
          label: "Hybrid",
          desc: "Heuristic baseline + AI refinement",
          icon: <Blend size={14} strokeWidth={2} />,
        },
      ] as const,
    [llmBrand],
  );

  const urlFieldId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);

  const llmReady =
    llmConfig.enabled &&
    (!!primaryApiKey(llmConfig).trim() || llmConfig.provider === "groq");
  const needsLlm = detectionMode === "llm" || detectionMode === "hybrid";

  // —— CSV parsing ——
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/);
      const urls: string[] = [];
      for (const raw of lines) {
        // Take the first comma-separated column and strip quotes
        const col = raw.split(",")[0].replace(/^["']|["']$/g, "").trim();
        // Skip empty lines and header rows (if it doesn't start with http)
        if (!col || !/^https?:\/\//i.test(col)) continue;
        if (urls.length < 100) urls.push(col);
      }
      if (urls.length === 0) {
        setErr("No valid URLs found in CSV. Each row must have an http(s):// URL in the first column.");
        return;
      }
      setErr(null);
      setMultiUrls(urls);
      setUrl(urls[0]);
      setCsvFileName(file.name);
    };
    reader.readAsText(file);
    // Reset so the same file can be re-uploaded
    e.target.value = "";
  };

  const clearCsv = () => {
    setMultiUrls([]);
    setCsvFileName(null);
    setUrl("");
  };

  // —— Scan handler ——
  const handleScan = async () => {
    setErr(null);
    setWarn(null);

    if (urlMode === "multi") {
      if (multiUrls.length === 0) {
        setErr("Upload a CSV file with URLs first.");
        return;
      }
    } else {
      if (!url.trim()) {
        setErr("Enter a URL first.");
        return;
      }
    }

    setScanning(true);
    try {
      // Always send llmConfig so the server can resolve keys from env vars
      // even when the client can't see them. The server's isScrapeLlmReady
      // handles final gating.
      const body =
        urlMode === "multi"
          ? {
              url: multiUrls[0],
              urls: multiUrls,
              urlMode: "multi" as const,
              detectionMode,
              llmConfig,
            }
          : {
              url,
              detectionMode,
              llmConfig,
            };

      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const isReady = urlMode === "multi" ? multiUrls.length > 0 : !!url.trim();

  // Chrome address-bar display
  const chromeDisplay =
    urlMode === "multi"
      ? multiUrls.length > 0
        ? `${multiUrls.length} URLs loaded`
        : "Multiple URLs…"
      : url || "https://…";

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
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#ff5f57]" aria-hidden />
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#febc2e]" aria-hidden />
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#28c840]" aria-hidden />
          <span className="ml-2 min-w-0 flex-1 truncate rounded-md border border-line bg-card px-2.5 py-1 font-mono text-[11px] text-muted">
            {chromeDisplay}
          </span>
        </div>

        <div className="p-6 sm:p-8">
          {/* —— Input mode toggle —— */}
          <div className={`${labelMono} mb-3`}>Input mode</div>
          <div className="mb-6 grid grid-cols-2 gap-2">
            {(
              [
                { mode: "single", label: "Single URL", icon: <Link2 size={14} strokeWidth={2} />, isDisabled: false },
                { mode: "multi", label: "Multiple URLs (CSV) Coming Soon", icon: <FileText size={14} strokeWidth={2} />, isDisabled: true },
              ] as const
            ).map(({ mode, label, icon, isDisabled }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setUrlMode(mode)}
                disabled={isDisabled}
                className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left text-sm font-semibold transition-colors duration-150 ${
                  isDisabled ? "cursor-not-allowed opacity-50" : ""
                } ${
                  urlMode === mode
                    ? "border-accent bg-accent-muted text-ink ring-1 ring-accent/15"
                    : "border-line bg-paper text-ink hover:border-line-strong hover:bg-card"
                }`}
              >
                <span className="shrink-0 text-muted">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* —— URL input (single mode) —— */}
          {urlMode === "single" && (
            <>
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
            </>
          )}

          {/* —— CSV upload (multi mode) —— */}
          {urlMode === "multi" && (
            <div>
              <div className={`${labelMono} mb-3`}>CSV file with URLs</div>
              {multiUrls.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed border-line bg-paper px-6 py-8 text-center transition-colors hover:border-accent/50 hover:bg-accent-muted/30"
                >
                  <Upload size={24} className="text-muted" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-ink">
                      Click to upload CSV
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-muted">
                      One URL per row · first column · up to 100 URLs
                    </p>
                  </div>
                </button>
              ) : (
                <div className="flex items-start justify-between gap-4 rounded-lg border border-emerald-200 bg-green-muted px-4 py-3">
                  <div className="flex items-start gap-3">
                    <FileText size={16} className="mt-0.5 shrink-0 text-brand-green" aria-hidden />
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {multiUrls.length} URL{multiUrls.length !== 1 ? "s" : ""} loaded
                        {csvFileName && (
                          <span className="ml-1.5 font-mono text-[10px] font-normal text-muted">
                            from {csvFileName}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted">
                        First URL used for content types &amp; AI detection · others use heuristic
                      </p>
                      <p className="mt-1 truncate font-mono text-[10px] text-muted">
                        {multiUrls[0]}
                        {multiUrls.length > 1 && ` + ${multiUrls.length - 1} more`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearCsv}
                    className="shrink-0 rounded p-1 text-muted transition-colors hover:bg-card hover:text-ink"
                    aria-label="Clear CSV"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="sr-only"
                onChange={handleCsvUpload}
                aria-hidden
              />
              {multiUrls.length > 0 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-xs font-medium text-accent hover:underline"
                >
                  Replace file
                </button>
              )}
            </div>
          )}

          {/* —— Detection mode —— */}
          <div className="mt-6">
            <div className={`${labelMono} mb-3`}>Detection mode</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {modeOptions.map(({ mode, label, desc, icon }) => (
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
                      {mode === "llm" && urlMode === "multi"
                        ? `Semantic · ${llmBrand} · first URL only`
                        : desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {needsLlm && !llmReady && (
              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-accent/25 bg-accent-muted/50 px-4 py-3 sm:flex-row sm:items-center">
                <AlertCircle size={16} className="shrink-0 text-accent" aria-hidden />
                <p className="flex-1 text-sm text-ink">
                  AI detection requires a verified API key (or Groq with
                  server-side GROQ_API_KEY).
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
                  <Bot size={14} className="shrink-0 text-brand-green" aria-hidden />
                  <span className="text-sm text-ink">
                    {llmBrand}{" "}
                    <code className="rounded bg-green-soft px-1 font-mono text-xs">
                      {llmConfig.model}
                    </code>{" "}
                    ready
                    {urlMode === "multi" && (
                      <span className="ml-1.5 font-mono text-[10px] text-muted">
                        · first URL only
                      </span>
                    )}
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

          {/* —— Options —— */}
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

          {/* —— Scan button —— */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              className={btnPrimary}
              onClick={() => void handleScan()}
              disabled={scanning || !isReady}
            >
              {scanning ? (
                <>
                  <span className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {urlMode === "multi"
                    ? `Scanning ${multiUrls.length} URLs…`
                    : detectionMode === "heuristic"
                      ? "Scanning…"
                      : "Detecting with AI…"}
                </>
              ) : (
                <>
                  <ScanLine size={16} strokeWidth={2} />
                  {urlMode === "multi" ? `Scan ${multiUrls.length} URLs` : "Scan page"}
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
