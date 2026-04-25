"use client";

import { Check, ExternalLink, RotateCcw } from "lucide-react";
import { useStackshift } from "@/store";
import {
  btnGhost,
  btnPrimary,
  cardStatic,
  stepEyebrow,
  stepLead,
  stepTitle,
} from "@/lib/ui";

const btnOutline =
  `${btnGhost} border-ink/15 bg-card px-5 py-2.5 text-sm font-medium hover:border-ink/25`;

export default function DoneStep() {
  const result = useStackshift((s) => s.migrationResult);
  const reset = useStackshift((s) => s.reset);
  const setStep = useStackshift((s) => s.setStep);

  if (!result) {
    return (
      <>
        <header className="mb-6 sm:mb-8">
          <span className={stepEyebrow}>Done</span>
          <h2 className={`${stepTitle} mt-2`}>
            No migration <span className="text-accent">yet</span>.
          </h2>
          <p className={`${stepLead} mt-3 max-w-[42rem]`}>
            Go back to the preview step and run a migration first.
          </p>
        </header>
        <button type="button" className={btnOutline} onClick={() => setStep("preview")}>
          ← Back to preview
        </button>
      </>
    );
  }

  const seconds = (result.elapsedMs / 1000).toFixed(1);
  const label = result.dryRun ? "Dry-run" : result.success ? "Complete" : "Failed";

  return (
    <>
      <header className="mb-6 sm:mb-8">
        <span className={stepEyebrow}>{label}</span>
        <h2 className={`${stepTitle} mt-2`}>
          {result.dryRun ? (
            <>
              Dry-run <span className="text-accent">complete</span>.
            </>
          ) : result.success ? (
            <>
              Landed in <span className="text-accent">Contentstack</span>.
            </>
          ) : (
            <>
              Migration <span className="text-accent">failed</span>.
            </>
          )}
        </h2>
      </header>

      {result.dryRun && result.payload ? (
        <>
          <p className={`${stepLead} mb-8 max-w-[42rem]`}>
            Nothing was written. Below is the exact JSON we would have sent.
          </p>
          <div className={`${cardStatic} overflow-hidden shadow-card-md`}>
            <div className="flex items-center gap-2 border-b border-line bg-paper-2 px-3 py-2.5 sm:px-4">
              <span className="h-2 w-2 rounded-full bg-[#ff5f57]" aria-hidden />
              <span className="h-2 w-2 rounded-full bg-[#febc2e]" aria-hidden />
              <span className="h-2 w-2 rounded-full bg-[#28c840]" aria-hidden />
              <span className="ml-2 min-w-0 flex-1 truncate rounded-md border border-line bg-card px-2 py-1 font-mono text-[11px] text-muted">
                payload.json
              </span>
            </div>
            <pre className="m-0 max-h-[min(60vh,480px)] overflow-auto bg-[#0f172a] p-5 font-mono text-xs leading-relaxed text-emerald-100/95">
              {JSON.stringify(result.payload, null, 2)}
            </pre>
          </div>
        </>
      ) : (
        <div className="mx-auto max-w-2xl py-6 text-center sm:py-10">
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-200 bg-green-muted text-brand-green shadow-sm sm:h-[5.5rem] sm:w-[5.5rem]"
            aria-hidden
          >
            <Check size={40} strokeWidth={2.5} />
          </div>
          <h3 className="font-sans text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {result.success ? "Done in" : "Partial run —"} {seconds}s
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted sm:text-[15px]">
            {result.success
              ? "Your content types and entries are live. Open Contentstack to review them."
              : "Some operations failed. Check the log below for details."}
          </p>

          <div
            className={`${cardStatic} mx-auto mt-8 grid max-w-xl overflow-hidden shadow-card-md sm:grid-cols-3`}
          >
            {[
              { num: result.entriesCreated, lbl: "Entries created" },
              { num: result.contentTypesCreated, lbl: "Types created" },
              { num: `${seconds}s`, lbl: "Elapsed" },
            ].map(({ num, lbl }, i) => (
              <div
                key={lbl}
                className={`p-5 text-left sm:p-6 ${i < 2 ? "border-b border-line sm:border-b-0 sm:border-r sm:border-line" : ""}`}
              >
                <div className="font-sans text-3xl font-semibold tabular-nums tracking-tight text-accent sm:text-4xl">
                  {num}
                </div>
                <div className="mt-2 font-mono text-[10px] font-medium uppercase tracking-wider text-muted">
                  {lbl}
                </div>
              </div>
            ))}
          </div>

          {result.pageEntryUid && (
            <div className="mx-auto mt-5 max-w-xl rounded-xl border border-emerald-200 bg-green-muted px-4 py-3 text-left font-mono text-[11px] text-muted sm:px-5">
              <span className="font-semibold text-brand-green">Page entry</span>{" "}
              <span className="text-ink">{result.pageEntryUid}</span>
            </div>
          )}
        </div>
      )}

      {result.logs.length > 0 && (
        <div className="mx-auto mt-8 max-w-xl overflow-x-auto rounded-xl border border-line bg-[#0f172a] px-5 py-4 font-mono text-xs leading-relaxed text-zinc-300">
          {result.logs.map((l, i) => (
            <div key={i} className="whitespace-pre-wrap break-words">
              <span className="text-zinc-500">
                [{new Date(l.timestamp).toLocaleTimeString()}]
              </span>{" "}
              <span className="font-medium text-accent-soft">{l.level.toUpperCase()}</span>{" "}
              {l.message}
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          className={btnOutline}
          onClick={() => {
            reset();
            setStep("url");
          }}
        >
          <RotateCcw size={16} strokeWidth={2} aria-hidden /> Migrate another page
        </button>
        {result.stackUrl && (
          <a
            className={btnPrimary}
            href={result.stackUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Contentstack <ExternalLink size={16} strokeWidth={2} aria-hidden />
          </a>
        )}
      </div>
    </>
  );
}
