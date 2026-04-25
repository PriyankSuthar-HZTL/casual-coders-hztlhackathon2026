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
import type { AnthropicModelsResponse } from "@/app/api/anthropic/models/route";
import type { GroqModelsResponse } from "@/app/api/groq/models/route";
import type { LlmProvider } from "@/types";
import {
  CLAUDE_MODELS,
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_GROQ_MODEL,
  GEMINI_MODELS,
  GROQ_MODELS,
} from "@/types";
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
  { id: "gemini" as const, label: "Google Gemini", available: true },
  { id: "anthropic" as const, label: "Anthropic Claude", available: false },
  { id: "openai" as const, label: "OpenAI", available: false },
];

interface AvailableModel {
  value: string;
  label: string;
}

function staticModelsForProvider(p: LlmProvider): AvailableModel[] {
  if (p === "anthropic") return [...CLAUDE_MODELS];
  if (p === "groq") return [...GROQ_MODELS];
  return [...GEMINI_MODELS];
}

function defaultModelForProvider(p: LlmProvider): string {
  if (p === "anthropic") return DEFAULT_CLAUDE_MODEL;
  if (p === "groq") return DEFAULT_GROQ_MODEL;
  return GEMINI_MODELS[0].value;
}

function providerDisplayName(p: LlmProvider): string {
  if (p === "anthropic") return "Claude";
  if (p === "groq") return "Groq";
  return "Gemini";
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

  const [fbLoading, setFbLoading] = useState(false);
  const [fbAvailableModels, setFbAvailableModels] = useState<
    AvailableModel[] | null
  >(null);
  const [fbStatusMsg, setFbStatusMsg] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const p = llmConfig.provider;
  const providerLabel = providerDisplayName(p);

  const modelsEndpoint = (prov: LlmProvider) => {
    if (prov === "anthropic") return "/api/anthropic/models";
    if (prov === "groq") return "/api/groq/models";
    return "/api/gemini/models";
  };

  const handleVerifyAndLoad = async () => {
    if (!llmConfig.apiKey.trim()) {
      setStatusMsg({ kind: "err", text: "Enter an API key first." });
      return;
    }
    setLoading(true);
    setStatusMsg(null);
    setAvailableModels(null);

    try {
      const res = await fetch(modelsEndpoint(p), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: llmConfig.apiKey }),
      });
      const data = (await res.json()) as
        | GeminiModelsResponse
        | AnthropicModelsResponse
        | GroqModelsResponse;

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

  const handleVerifyFallback = async () => {
    const fp = llmConfig.fallbackProvider;
    if (!fp) return;
    const key = (llmConfig.fallbackApiKey ?? "").trim();
    if (!key) {
      setFbStatusMsg({ kind: "err", text: "Enter backup API key first." });
      return;
    }
    setFbLoading(true);
    setFbStatusMsg(null);
    setFbAvailableModels(null);
    try {
      const res = await fetch(modelsEndpoint(fp), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = (await res.json()) as
        | GeminiModelsResponse
        | AnthropicModelsResponse
        | GroqModelsResponse;
      if (!data.ok || !data.models?.length) {
        setFbStatusMsg({
          kind: "err",
          text: data.error ?? "No models returned.",
        });
        return;
      }
      setFbAvailableModels(data.models);
      const ids = data.models.map((m) => m.value);
      const cur = llmConfig.fallbackModel ?? "";
      if (!ids.includes(cur)) {
        setLlmConfig({ fallbackModel: data.models[0].value });
      }
      setFbStatusMsg({
        kind: "ok",
        text: `Backup key OK · ${data.models.length} model(s)`,
      });
    } catch (e) {
      setFbStatusMsg({
        kind: "err",
        text: e instanceof Error ? e.message : "Network error.",
      });
    } finally {
      setFbLoading(false);
    }
  };

  const staticPrimary: AvailableModel[] = staticModelsForProvider(p);

  const modelOptions: AvailableModel[] =
    availableModels ??
    (llmConfig.model
      ? [{ value: llmConfig.model, label: llmConfig.model }]
      : staticPrimary);

  const selectProvider = (id: LlmProvider) => {
    setStatusMsg(null);
    setFbStatusMsg(null);
    setAvailableModels(null);
    setFbAvailableModels(null);
    if (id === "gemini") {
      setLlmConfig({
        provider: "gemini",
        model: GEMINI_MODELS[0].value,
        enabled: false,
      });
    } else if (id === "anthropic") {
      setLlmConfig({
        provider: "anthropic",
        model: DEFAULT_CLAUDE_MODEL,
        enabled: false,
      });
    } else if (id === "groq") {
      setLlmConfig({
        provider: "groq",
        model: DEFAULT_GROQ_MODEL,
        enabled: false,
      });
    }
  };

  const fb = llmConfig.fallbackProvider;
  const fbStatic = fb ? staticModelsForProvider(fb) : [];
  const fbModelOptions: AvailableModel[] =
    fb && fbAvailableModels
      ? fbAvailableModels
      : fb && (llmConfig.fallbackModel ?? "")
        ? [{ value: llmConfig.fallbackModel!, label: llmConfig.fallbackModel! }]
        : fbStatic;

  const fallbackChoices: { value: "" | LlmProvider; label: string }[] = [
    { value: "", label: "None" },
    ...(["gemini", "anthropic", "groq"] as const)
      .filter((x) => x !== p)
      .map((x) => ({
        value: x,
        label: providerDisplayName(x),
      })),
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div
        aria-hidden
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-scrim-in"
        onClick={onClose}
      />
      <div
        className={`relative max-h-[min(92vh,880px)] w-full max-w-[560px] overflow-y-auto ${cardStatic} animate-fade-in p-6 shadow-scrim sm:p-8`}
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
              Configure <span className="text-accent">{providerLabel}</span>
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
          <span className={labelMono}>Primary LLM</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PROVIDERS.map((prov) => (
              <button
                key={prov.id}
                type="button"
                disabled={!prov.available}
                onClick={() =>
                  prov.available &&
                  (prov.id === "gemini" ||
                    prov.id === "anthropic") &&
                  selectProvider(prov.id)
                }
                className={`rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 ${
                  prov.id === llmConfig.provider && prov.available
                    ? "border-accent bg-accent-muted text-ink ring-1 ring-accent/15"
                    : prov.available
                      ? "cursor-pointer border-line bg-card text-ink hover:border-line-strong"
                      : "cursor-not-allowed border-line/50 bg-paper-2 text-muted"
                }`}
              >
                {prov.label}
                {!prov.available && (
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
            {p === "anthropic"
              ? "Anthropic API key"
              : p === "groq"
                ? "Groq API key"
                : "Gemini API key"}
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
            placeholder={
              p === "anthropic" ? "sk-ant-…" : p === "groq" ? "gsk_…" : "AIza…"
            }
            spellCheck={false}
            autoComplete="off"
          />
          <p className="mt-1.5 font-mono text-[10px] text-muted">
            {p === "anthropic" ? (
              <>
                Get a key at{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  className="text-accent underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Anthropic Console
                </a>
                .
              </>
            ) : p === "groq" ? (
              <>
                Get a key at{" "}
                <a
                  href="https://console.groq.com/keys"
                  className="text-accent underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Groq Console
                </a>
                . Optional: set <code className="text-ink/80">GROQ_API_KEY</code>{" "}
                on the server and enable AI without storing a key here.
              </>
            ) : (
              <>
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
              </>
            )}
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
                <option value="">— pick provider / verify key —</option>
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
            {p === "anthropic"
              ? "Sonnet balances quality and cost; Haiku is fastest for large pages."
              : p === "groq"
                ? "Groq is fast; pick a model your key can access (verify loads the live list)."
                : "Flash is faster and cheaper; Pro is better for complex pages."}
          </p>
        </div>

        <div className="mb-6 rounded-lg border border-line bg-paper-2/60 p-4">
          <span className={labelMono}>Backup LLM (optional)</span>
          <p className="mt-1 font-mono text-[10px] text-muted">
            If the primary provider errors after retries, we try this vendor once
            before heuristic-only (or heuristic baseline in hybrid mode).
          </p>
          <select
            className={`${inputMono} mt-3 w-full`}
            value={fb ?? ""}
            onChange={(e) => {
              const v = e.target.value as "" | LlmProvider;
              setFbStatusMsg(null);
              setFbAvailableModels(null);
              if (!v) {
                setLlmConfig({
                  fallbackProvider: undefined,
                  fallbackApiKey: "",
                  fallbackModel: "",
                });
              } else {
                setLlmConfig({
                  fallbackProvider: v,
                  fallbackModel: defaultModelForProvider(v),
                  fallbackApiKey: llmConfig.fallbackApiKey ?? "",
                });
              }
            }}
          >
            {fallbackChoices.map((opt) => (
              <option key={opt.value || "none"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {fb && (
            <div className="mt-4 space-y-3 border-t border-line/80 pt-4">
              <div>
                <label className={labelMono} htmlFor="fb-api-key">
                  Backup API key ({providerDisplayName(fb)})
                </label>
                <input
                  id="fb-api-key"
                  className={`${inputMono} mt-1`}
                  type="password"
                  value={llmConfig.fallbackApiKey ?? ""}
                  onChange={(e) =>
                    setLlmConfig({ fallbackApiKey: e.target.value })
                  }
                  placeholder={
                    fb === "anthropic"
                      ? "sk-ant-…"
                      : fb === "groq"
                        ? "gsk_…"
                        : "AIza…"
                  }
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelMono} htmlFor="fb-model">
                  Backup model
                </label>
                <div className="relative mt-1">
                  <select
                    id="fb-model"
                    className={`${inputMono} w-full appearance-none pr-10 ${fbLoading ? "opacity-50" : ""}`}
                    value={
                      llmConfig.fallbackModel ?? defaultModelForProvider(fb)
                    }
                    onChange={(e) =>
                      setLlmConfig({ fallbackModel: e.target.value })
                    }
                    disabled={fbLoading}
                  >
                    {fbModelOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                    {fbLoading ? (
                      <Loader2 size={14} className="animate-spin" aria-hidden />
                    ) : (
                      <ChevronDown size={14} aria-hidden />
                    )}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className={btnGhost}
                onClick={() => void handleVerifyFallback()}
                disabled={fbLoading || !(llmConfig.fallbackApiKey ?? "").trim()}
              >
                {fbLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" aria-hidden />{" "}
                    Verifying…
                  </>
                ) : (
                  <>
                    <Key size={14} aria-hidden /> Verify backup key
                  </>
                )}
              </button>
              {fbStatusMsg && (
                <p
                  className={`font-mono text-[10px] font-medium ${
                    fbStatusMsg.kind === "ok"
                      ? "text-brand-green"
                      : "text-brand-red"
                  }`}
                  role={fbStatusMsg.kind === "err" ? "alert" : "status"}
                >
                  {fbStatusMsg.text}
                </p>
              )}
            </div>
          )}
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
                  desc: `Semantic understanding via ${providerLabel}`,
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
          <Key size={10} className="mt-0.5 shrink-0" aria-hidden /> Keys are
          stored in your browser (localStorage) and sent only to your MigrateX
          deployment&apos;s API routes when you scan — not to us.
        </p>
      </div>
    </div>
  );
}
