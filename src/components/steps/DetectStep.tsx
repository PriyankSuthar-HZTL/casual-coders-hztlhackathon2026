"use client";

import { useMemo, useState } from "react";
import { Eye, ArrowRight, Bot, Cpu, Blend, AlertTriangle } from "lucide-react";
import { useStackshift } from "@/store";
import type { MatchResponse } from "@/types";
import {
  btnGhost,
  btnOnDark,
  btnOnDarkPrimary,
  cardStatic,
  stepEyebrow,
  stepLead,
  stepTitle,
} from "@/lib/ui";

export default function DetectStep() {
  const components = useStackshift((s) => s.components);
  const selectedIds = useStackshift((s) => s.selectedIds);
  const scannedUrl = useStackshift((s) => s.url);
  const config = useStackshift((s) => s.config);
  const toggle = useStackshift((s) => s.toggleComponentSelected);
  const selectAll = useStackshift((s) => s.selectAll);
  const selectNone = useStackshift((s) => s.selectNone);
  const setStep = useStackshift((s) => s.setStep);
  const setMatches = useStackshift((s) => s.setMatches);
  const detectionMethod = useStackshift((s) => s.detectionMethod);

  const [inspecting, setInspecting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedCount = selectedIds.length;
  const totalCount = components.length;
  const selectedComponents = useMemo(
    () => components.filter((c) => selectedIds.includes(c.id)),
    [components, selectedIds],
  );

  const handleContinue = async () => {
    setErr(null);
    if (!selectedCount) {
      setErr("Select at least one component.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/contentstack/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, components: selectedComponents }),
      });
      const data = (await res.json()) as MatchResponse;
      if (!data.ok) {
        setErr(data.error ?? "Match failed.");
        return;
      }
      setMatches(data.matches);
      setStep("integrations");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="mb-6 sm:mb-8">
        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <span className={stepEyebrow}>Detect</span>
        </div>
        <h2 className={stepTitle}>
          Components we <span className="text-accent">found</span>.
        </h2>
        <p className={`${stepLead} mt-3 max-w-[42rem]`}>
          Choose blocks to send to Contentstack. Each row shows confidence,
          preview, and source. Deselect anything noisy.
        </p>
      </header>

      {detectionMethod && (
        <div className="mb-4">
          <DetectionMethodBadge method={detectionMethod} />
        </div>
      )}

      <div className={`${cardStatic} overflow-hidden shadow-card-md`}>
        <div className="flex flex-col gap-4 border-b border-white/10 bg-accent px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="font-mono text-xs tracking-wide text-white">
            <strong className="text-lg font-semibold text-white">
              {selectedCount}
            </strong>
            <span className="text-white"> / {totalCount} selected</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnOnDark} onClick={selectAll}>
              Select all
            </button>
            <button type="button" className={btnOnDark} onClick={selectNone}>
              Clear
            </button>
            <button
              type="button"
              className={'inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white px-3.5 py-2 text-xs font-medium text-accent backdrop-blur-sm transition-all duration-150 hover:border-white hover:bg-transparent hover:text-white disabled:pointer-events-none disabled:opacity-40'}
              onClick={() => void handleContinue()}
              disabled={busy || !selectedCount}
            >
              {busy ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Matching…
                </>
              ) : (
                <>
                  Continue to integrations <ArrowRight size={14} aria-hidden />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px] divide-y divide-line">
            {components.map((c) => {
              const selected = selectedIds.includes(c.id);
              const pct = Math.round(c.confidence * 100);
              const barColor =
                c.confidence >= 0.8
                  ? "bg-brand-green"
                  : c.confidence >= 0.7
                    ? "bg-accent"
                    : "bg-brand-yellow";
              return (
                <div
                  key={c.id}
                  className={`grid items-center gap-3 px-4 py-4 transition-colors sm:gap-4 sm:px-5 sm:py-[18px] ${
                    selected
                      ? "bg-accent-muted/60"
                      : "bg-card hover:bg-paper-2/80"
                  }`}
                  style={{
                    gridTemplateColumns: "40px minmax(0,1.2fr) minmax(0,1fr) 140px 100px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggle(c.id)}
                    className="h-4 w-4 shrink-0 rounded border-line accent-accent focus:ring-2 focus:ring-accent/30"
                    aria-label={`Select ${c.name}`}
                  />

                  <div className="min-w-0 font-medium leading-snug text-ink">
                    <span className="block truncate">{c.name}</span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] font-normal uppercase tracking-wide text-muted">
                      {c.kind} · {c.selector}
                    </span>
                  </div>

                  <div className="hidden min-w-0 text-sm italic text-muted sm:block sm:truncate">
                    {c.preview}
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                      <div
                        className={`conf-fill ${barColor}`}
                        style={{ ["--w" as string]: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 tabular-nums text-ink">
                      {pct}%
                    </span>
                  </div>

                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() =>
                      setInspecting(inspecting === c.id ? null : c.id)
                    }
                  >
                    <Eye size={14} aria-hidden /> Inspect
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {inspecting &&
        (() => {
          const ic = components.find((c) => c.id === inspecting);
          const srcdoc = ic?.previewHtml
            ? `<!DOCTYPE html><html><head><base href="${scannedUrl}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*,*::before,*::after{box-sizing:border-box}body{margin:0;padding:0}img{max-width:100%}</style></head><body>${ic.previewHtml}</body></html>`
            : null;
          return (
            <div
              className={`${cardStatic} mt-4 p-6 shadow-card-md sm:p-8`}
              role="region"
              aria-label={ic ? `Inspect ${ic.name}` : "Inspect"}
            >
              <div className="mb-5 flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="font-sans text-xl font-semibold tracking-tight text-ink">
                  Inspect — {ic?.name}
                </h3>
                <code className="font-mono text-[11px] text-accent">
                  {ic?.selector}
                </code>
              </div>
              {srcdoc && (
                <div className="mb-5 overflow-hidden rounded-lg border border-line bg-card">
                  <iframe
                    srcDoc={srcdoc}
                    sandbox="allow-same-origin"
                    title="Component preview"
                    className="block h-[min(50vh,340px)] w-full border-none"
                  />
                </div>
              )}
              <pre className="max-h-[min(40vh,300px)] overflow-auto rounded-lg border border-line bg-paper-2 p-4 font-mono text-xs leading-relaxed text-muted">
                {JSON.stringify(ic?.fields, null, 2)}
              </pre>
            </div>
          );
        })()}

      {err && (
        <p className="mt-4 text-sm text-brand-red" role="alert">
          {err}
        </p>
      )}
    </>
  );
}

function DetectionMethodBadge({ method }: { method: string }) {
  const map: Record<
    string,
    { icon: React.ReactNode; label: string; cls: string }
  > = {
    heuristic: {
      icon: <Cpu size={11} strokeWidth={2} />,
      label: "Heuristic detection",
      cls: "border-line bg-paper-2 text-muted",
    },
    llm: {
      icon: <Bot size={11} strokeWidth={2} />,
      label: "AI detection",
      cls: "border-emerald-200 bg-green-muted text-brand-green",
    },
    hybrid: {
      icon: <Blend size={11} strokeWidth={2} />,
      label: "Hybrid detection",
      cls: "border-emerald-200 bg-green-muted text-brand-green",
    },
    heuristic_fallback: {
      icon: <AlertTriangle size={11} strokeWidth={2} />,
      label: "Heuristic (AI fallback)",
      cls: "border-amber-200 bg-yellow-soft text-brand-yellow",
    },
  };
  const entry = map[method] ?? map["heuristic"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-wide ${entry.cls}`}
    >
      {entry.icon} {entry.label}
    </span>
  );
}
