"use client";

import { useStackshift } from "@/store";
import type { StepKey } from "@/types";
import { Check } from "lucide-react";

const STEPS: { key: StepKey; label: string; hint: string }[] = [
  { key: "url", label: "URL", hint: "Scan a page" },
  { key: "detect", label: "Detect", hint: "Review blocks" },
  { key: "match", label: "Match", hint: "Map types" },
  { key: "page", label: "Page", hint: "Page type" },
  { key: "preview", label: "Preview", hint: "Edit & verify" },
  { key: "done", label: "Migrate", hint: "Push to stack" },
];

export default function Stepper() {
  const currentStep = useStackshift((s) => s.currentStep);
  const setStep = useStackshift((s) => s.setStep);
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <nav
      className="-mx-1 mb-8 overflow-x-auto pb-1 sm:mb-10"
      aria-label="Migration steps"
    >
      <ol className="flex min-w-0 items-stretch gap-1.5 px-1 sm:gap-2">
        {STEPS.map((step, i) => {
          const isDone = i < currentIndex;
          const isActive = i === currentIndex;
          const clickable = i <= currentIndex;

          return (
            <li key={step.key} className="flex min-w-0 shrink-0 items-center">
              <button
                type="button"
                className={[
                  "flex min-h-[44px] min-w-[100px] max-w-[140px] flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-all duration-150 sm:min-w-[120px] sm:max-w-none sm:px-4",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2",
                  isDone &&
                    "cursor-pointer border-line bg-paper-2 text-ink hover:border-line-strong hover:bg-paper",
                  isActive &&
                    "border-accent bg-accent-muted text-ink shadow-step-active ring-1 ring-accent/10",
                  !isDone &&
                    !isActive &&
                    "cursor-not-allowed border-line/60 bg-paper/50 text-muted opacity-70",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => clickable && setStep(step.key)}
                disabled={!clickable}
                aria-current={isActive ? "step" : undefined}
              >
                <span className="flex w-full items-center justify-between gap-1">
                  <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {isDone && (
                    <Check
                      className="shrink-0 text-brand-green"
                      size={12}
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  )}
                </span>
                <span className="font-sans text-[13px] font-semibold leading-tight tracking-tight">
                  {step.label}
                </span>
                <span className="line-clamp-1 font-mono text-[9px] uppercase tracking-wide text-muted opacity-80">
                  {step.hint}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <span
                  className="mx-0.5 hidden h-px w-4 shrink-0 bg-line sm:block"
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
