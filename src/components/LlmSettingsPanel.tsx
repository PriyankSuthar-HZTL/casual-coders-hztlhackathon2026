"use client";

import { useState } from "react";
import {
  Bot,
  Check,
  AlertCircle,
  X,
  Key,
  ChevronDown,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useStackshift } from "@/store";
import type { GeminiModelsResponse } from "@/app/api/gemini/models/route";
import {
  btnGhost,
  btnPrimary,
  cardStatic,
  iconButton,
  input,
  labelMono,
} from "@/lib/ui";

const inputMono = `${input} font-mono text-sm`;

const PROVIDERS = [
  { id: "gemini", label: "Google Gemini", available: true },
  { id: "openai", label: "OpenAI", available: false },
  { id: "anthropic", label: "Anthropic Claude", available: false },
];

interface AvailableModel {
  value: string;
  label: string;
}

export default function LlmSettingsPanel({ onClose }: { onClose: () => void }) {
  const llmConfig = useStackshift((s) => s.llmConfig);
  const setLlmConfig = useStackshift((s) => s.setLlmConfig);
  const detectionMode = useStackshift((s) => s.detectionMode);
  const setDetectionMode = useStackshift((s) => s.setDetectionMode);

  const [loading, setLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<
    AvailableModel[] | null
  >(null);
  const [statusMsg, setStatusMsg] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const handleVerifyAndLoad = async () => {
    if (!llmConfig.apiKey.trim()) {
      setStatusMsg({ kind: "err", text: "Enter an API key first." });
      return;
    }
    setLoading(true);
    setStatusMsg(null);
    setAvailableModels(null);

    try {
      const res = await fetch("/api/gemini/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: llmConfig.apiKey }),
      });
      const data = (await res.json()) as GeminiModelsResponse;

      if (!data.ok || !data.models?.length) {
        setStatusMsg({
          kind: "err",
          text: data.error ?? "No models returned.",
        });
        setLlmConfig({ enabled: false });
        return;
      }

      setAvailableModels(data.models);

      const ids = data.models.map((m) => m.value);
      const currentValid = ids.includes(llmConfig.model);
      if (!currentValid) {
        setLlmConfig({ model: data.models[0].value });
      }

      setLlmConfig({ enabled: true });
      setStatusMsg({
        kind: "ok",
        text: `Key verified · ${data.models.length} model${data.models.length === 1 ? "" : "s"} available`,
      });
    } catch (e) {
      setStatusMsg({
        kind: "err",
        text: e instanceof Error ? e.message : "Network error.",
      });
    } finally {
      setLoading(false);
    }
  };

  const modelOptions: AvailableModel[] =
    availableModels ??
    (llmConfig.model
      ? [{ value: llmConfig.model, label: llmConfig.model }]
      : []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div
        aria-hidden
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-scrim-in"
        onClick={onClose}
      />
      <div
        className={`relative max-h-[min(90vh,760px)] w-full max-w-[540px] overflow-y-auto ${cardStatic} animate-fade-in p-6 shadow-scrim sm:p-8`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="llm-panel-title"
      >
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-accent">
              <Bot size={12} strokeWidth={2} aria-hidden /> AI detection
            </p>
            <h3
              id="llm-panel-title"
              className="mt-1 font-sans text-xl font-semibold tracking-tight text-ink sm:text-2xl"
            >
              Configure <span className="text-accent">Gemini</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={iconButton}
            aria-label="Close"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="mb-5">
          <span className={labelMono}>LLM provider</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={!p.available}
                onClick={() => p.available && setLlmConfig({ provider: "gemini" })}
                className={`rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 ${
                  p.id === llmConfig.provider && p.available
                    ? "border-accent bg-accent-muted text-ink ring-1 ring-accent/15"
                    : p.available
                      ? "cursor-pointer border-line bg-card text-ink hover:border-line-strong"
                      : "cursor-not-allowed border-line/50 bg-paper-2 text-muted"
                }`}
              >
                {p.label}
                {!p.available && (
                  <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-wide text-muted/70">
                    Coming soon
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className={labelMono} htmlFor="llm-api-key">
            Gemini API key
          </label>
          <input
            id="llm-api-key"
            className={inputMono}
            type="password"
            value={llmConfig.apiKey}
            onChange={(e) => {
              setLlmConfig({ apiKey: e.target.value });
              setStatusMsg(null);
              setAvailableModels(null);
              if (!e.target.value.trim()) setLlmConfig({ enabled: false });
            }}
            placeholder="AIza…"
            spellCheck={false}
            autoComplete="off"
          />
          <p className="mt-1.5 font-mono text-[10px] text-muted">
            Get a key at{" "}
            <a
              href="https://aistudio.google.com/apikey"
              className="text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google AI Studio
            </a>
            . Free tier available.
          </p>
        </div>

        <div className="mb-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className={`${labelMono} mb-0`} htmlFor="llm-model">
              Model
            </label>
            {availableModels !== null && (
              <span className="font-mono text-[9px] font-medium uppercase tracking-wide text-brand-green">
                {availableModels.length} available for your key
              </span>
            )}
            {availableModels === null && llmConfig.apiKey && (
              <span className="font-mono text-[9px] uppercase tracking-wide text-muted">
                Verify key to load models
              </span>
            )}
          </div>
          <div className="relative">
            <select
              id="llm-model"
              className={`${inputMono} appearance-none pr-10 ${loading ? "opacity-50" : ""}`}
              value={llmConfig.model}
              onChange={(e) => setLlmConfig({ model: e.target.value })}
              disabled={loading}
            >
              {modelOptions.length === 0 ? (
                <option value="">— verify key to load models —</option>
              ) : (
                modelOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))
              )}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
              {loading ? (
                <Loader2 size={14} className="animate-spin" aria-hidden />
              ) : (
                <ChevronDown size={14} aria-hidden />
              )}
            </span>
          </div>
          <p className="mt-1.5 font-mono text-[10px] text-muted">
            Flash is faster and cheaper; Pro is better for complex pages.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={llmConfig.enabled}
            onClick={() => setLlmConfig({ enabled: !llmConfig.enabled })}
            className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 ${
              llmConfig.enabled
                ? "border-accent bg-accent"
                : "border-line bg-paper-2"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150 ${
                llmConfig.enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-sm text-ink">
            AI detection {llmConfig.enabled ? "enabled" : "disabled"}
          </span>
        </div>

        <div className="mb-6">
          <span className={labelMono}>Default detection mode</span>
          <div className="flex flex-col gap-2">
            {(
              [
                {
                  mode: "heuristic" as const,
                  label: "Heuristic only",
                  desc: "Fast, deterministic, no API cost",
                },
                {
                  mode: "llm" as const,
                  label: "AI only",
                  desc: "Semantic understanding via Gemini",
                },
                {
                  mode: "hybrid" as const,
                  label: "Hybrid",
                  desc: "Heuristic baseline + AI refinement",
                },
              ] as const
            ).map(({ mode, label, desc }) => (
              <label
                key={mode}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors duration-150 ${
                  detectionMode === mode
                    ? "border-accent bg-accent-muted ring-1 ring-accent/10"
                    : "border-line bg-card hover:border-line-strong"
                }`}
              >
                <input
                  type="radio"
                  name="detectionMode"
                  value={mode}
                  checked={detectionMode === mode}
                  onChange={() => setDetectionMode(mode)}
                  className="mt-1 accent-accent"
                />
                <div>
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-muted">
                    {desc}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            className={btnPrimary}
            onClick={() => void handleVerifyAndLoad()}
            disabled={loading || !llmConfig.apiKey.trim()}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden />
                Loading models…
              </>
            ) : availableModels !== null ? (
              <>
                <RefreshCw size={14} aria-hidden /> Refresh models
              </>
            ) : (
              <>
                <Key size={14} aria-hidden /> Verify &amp; load models
              </>
            )}
          </button>

          <button type="button" className={btnGhost} onClick={onClose}>
            Done
          </button>

          {statusMsg && (
            <span
              className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                statusMsg.kind === "ok" ? "text-brand-green" : "text-brand-red"
              }`}
              role={statusMsg.kind === "err" ? "alert" : "status"}
            >
              {statusMsg.kind === "ok" ? (
                <Check size={14} aria-hidden />
              ) : (
                <AlertCircle size={14} aria-hidden />
              )}
              {statusMsg.text}
            </span>
          )}
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-lg border border-dashed border-line bg-paper-2 px-3 py-2 font-mono text-[10px] text-muted">
          <Key size={10} className="mt-0.5 shrink-0" aria-hidden /> API key
          stored client-side in localStorage · never sent to our servers
        </p>
      </div>
    </div>
  );
}
