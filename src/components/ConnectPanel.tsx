"use client";

import { useState } from "react";
import { Lock, Check, AlertCircle, X, KeyRound } from "lucide-react";
import { useStackshift } from "@/store";
import type {
  ContentstackConfig,
  ContentstackTestResponse,
  Region,
} from "@/types";
import {
  btnGhost,
  btnPrimary,
  cardStatic,
  iconButton,
  input,
  labelMono,
} from "@/lib/ui";

const REGIONS: { value: Region; label: string }[] = [
  { value: "na", label: "North America" },
  { value: "eu", label: "Europe" },
  { value: "au", label: "Australia" },
  { value: "azure-na", label: "Azure NA" },
  { value: "azure-eu", label: "Azure EU" },
  { value: "gcp-na", label: "GCP NA" },
];

const inputMono = `${input} font-mono text-xs`;

interface Props {
  mode: "login" | "settings";
  onClose?: () => void;
}

export default function ConnectPanel({ mode, onClose }: Props) {
  const config = useStackshift((s) => s.config);
  const setConfig = useStackshift((s) => s.setConfig);
  const setConnectionOk = useStackshift((s) => s.setConnectionOk);
  const connectionOk = useStackshift((s) => s.connectionOk);
  const disconnect = useStackshift((s) => s.disconnect);

  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const canTest = config.apiKey.trim() && config.managementToken.trim();

  const handleConnect = async () => {
    setTesting(true);
    setTestMsg(null);
    try {
      const res = await fetch("/api/contentstack/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = (await res.json()) as ContentstackTestResponse;
      if (data.ok) {
        setConnectionOk(
          true,
          data.contentTypeCount,
          data.stackName ?? null,
        );
        setTestMsg({
          kind: "ok",
          text: `Connected. ${data.contentTypeCount ?? 0} content types found.`,
        });
        if (mode === "settings" && onClose) setTimeout(() => onClose(), 900);
      } else {
        setConnectionOk(false);
        setTestMsg({
          kind: "err",
          text: data.error ?? "Connection failed.",
        });
      }
    } catch (err) {
      setConnectionOk(false);
      setTestMsg({
        kind: "err",
        text: err instanceof Error ? err.message : "Network error.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setTestMsg(null);
    if (onClose) onClose();
  };
  const isLogin = mode === "login";

  if (!isLogin) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <div
          aria-hidden
          className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-scrim-in"
          onClick={() => onClose?.()}
        />
        <div
          className={`relative max-h-[min(90vh,720px)] w-full max-w-[520px] overflow-y-auto ${cardStatic} animate-fade-in p-6 shadow-scrim sm:p-8`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="connect-panel-title"
        >
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-accent">
                Stack settings
              </p>
              <h3
                id="connect-panel-title"
                className="mt-1 font-sans text-xl font-semibold tracking-tight text-ink sm:text-2xl"
              >
                {connectionOk ? "Connection" : "Connect"}
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
          <SettingsForm
            config={config}
            setConfig={setConfig}
            canTest={!!canTest}
            testing={testing}
            connectionOk={connectionOk}
            testMsg={testMsg}
            handleConnect={() => void handleConnect()}
            handleDisconnect={handleDisconnect}
            mode={mode}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-[2vh] flex max-w-[520px] flex-col gap-6 sm:mt-[4vh]">
      <div className={`${cardStatic} animate-fade-in overflow-hidden shadow-card-lg`}>
        <div
          className="h-1 w-full bg-gradient-to-r from-accent via-brand-yellow to-brand-green"
          aria-hidden
        />
        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-muted px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-accent">
              <KeyRound size={14} strokeWidth={2} aria-hidden /> Connect your
              stack
            </div>
            <h2 className="font-sans text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Management token{" "}
              <span className="text-accent">setup</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-[15px]">
              MigrateX needs a Management Token to read content types and
              create entries. Stored in{" "}
              <code className="rounded bg-paper-2 px-1 font-mono text-xs text-ink">
                localStorage
              </code>
              .
            </p>
          </div>
          <SettingsForm
            config={config}
            setConfig={setConfig}
            canTest={!!canTest}
            testing={testing}
            connectionOk={connectionOk}
            testMsg={testMsg}
            handleConnect={() => void handleConnect()}
            handleDisconnect={handleDisconnect}
            mode={mode}
          />
          <div className="mt-8 border-t border-line pt-6">
            <ul className="space-y-2 text-sm text-muted">
              <li className="flex gap-2">
                <span className="text-accent" aria-hidden>
                  ·
                </span>
                Contentstack → Settings → Tokens
              </li>
              <li className="flex gap-2">
                <span className="text-accent" aria-hidden>
                  ·
                </span>
                Create a Management Token with read/write
              </li>
              <li className="flex gap-2">
                <span className="text-accent" aria-hidden>
                  ·
                </span>
                Paste above, connect, and start migrating
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsForm({
  config,
  setConfig,
  canTest,
  testing,
  connectionOk,
  testMsg,
  handleConnect,
  handleDisconnect,
  mode,
}: {
  config: ContentstackConfig;
  setConfig: (c: Partial<ContentstackConfig>) => void;
  canTest: boolean;
  testing: boolean;
  connectionOk: boolean;
  testMsg: { kind: "ok" | "err"; text: string } | null;
  handleConnect: () => void;
  handleDisconnect: () => void;
  mode: "login" | "settings";
}) {
  return (
    <>
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelMono} htmlFor="settings-api-key">
            Stack API Key
          </label>
          <input
            id="settings-api-key"
            className={inputMono}
            value={config.apiKey}
            onChange={(e) => setConfig({ apiKey: e.target.value })}
            placeholder="blt1234567890abcdef"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div>
          <label className={labelMono} htmlFor="settings-mgmt-token">
            Management Token
          </label>
          <input
            id="settings-mgmt-token"
            className={inputMono}
            type="password"
            value={config.managementToken}
            onChange={(e) => setConfig({ managementToken: e.target.value })}
            placeholder="cs••••••••••••••••"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelMono} htmlFor="settings-env">
              Environment
            </label>
            <input
              id="settings-env"
              className={inputMono}
              value={config.environment}
              onChange={(e) => setConfig({ environment: e.target.value })}
              placeholder="development"
            />
          </div>
          <div>
            <label className={labelMono} htmlFor="settings-region">
              Region
            </label>
            <select
              id="settings-region"
              className={inputMono}
              value={config.region}
              onChange={(e) =>
                setConfig({ region: e.target.value as Region })
              }
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="inline-flex max-w-full items-center gap-2 rounded-lg border border-dashed border-line bg-paper-2 px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wide text-muted">
          <Lock size={12} className="shrink-0" aria-hidden /> Client-side only
          · never sent to our servers
        </p>
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          className={btnPrimary}
          onClick={handleConnect}
          disabled={!canTest || testing}
        >
          {testing ? (
            <>
              <span className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Connecting…
            </>
          ) : connectionOk && mode === "settings" ? (
            "Re-verify & save"
          ) : (
            "Sign in"
          )}
        </button>
        {connectionOk && mode === "settings" && (
          <button
            type="button"
            className={btnGhost}
            onClick={handleDisconnect}
          >
            Disconnect
          </button>
        )}
        {testMsg && (
          <span
            className={`inline-flex items-center gap-1.5 text-sm font-medium ${
              testMsg.kind === "ok" ? "text-brand-green" : "text-brand-red"
            }`}
            role={testMsg.kind === "err" ? "alert" : "status"}
          >
            {testMsg.kind === "ok" ? (
              <Check size={14} aria-hidden />
            ) : (
              <AlertCircle size={14} aria-hidden />
            )}
            {testMsg.text}
          </span>
        )}
      </div>
    </>
  );
}
