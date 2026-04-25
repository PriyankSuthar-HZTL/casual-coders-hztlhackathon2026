"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck, Check, AlertCircle } from "lucide-react";
import { useStackshift } from "@/store";
import type { ContentstackTestResponse, Region } from "@/types";
import {
  btnGhostSm,
  btnPrimary,
  cardStatic,
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

type Phase = "credentials" | "tfa";

interface LoginApiResponse {
  ok: boolean;
  authToken?: string;
  needsTfa?: boolean;
  tfaType?: string;
  error?: string;
}

const inputMono = `${input} font-mono text-xs`;

export default function LoginPanel() {
  const config = useStackshift((s) => s.config);
  const setConfig = useStackshift((s) => s.setConfig);
  const setConnectionOk = useStackshift((s) => s.setConnectionOk);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [environment, setEnvironment] = useState(config.environment);
  const [region, setRegion] = useState<Region>(config.region);
  const [tfaToken, setTfaToken] = useState("");
  const [phase, setPhase] = useState<Phase>("credentials");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  const canSubmit =
    phase === "credentials"
      ? email.trim() && password.trim() && apiKey.trim()
      : tfaToken.trim().length > 0;

  const handleSubmit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const loginRes = await fetch("/api/contentstack/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          tfa_token: phase === "tfa" ? tfaToken.trim() : undefined,
          region,
        }),
      });
      const loginData = (await loginRes.json()) as LoginApiResponse;

      if (!loginData.ok) {
        if (loginData.needsTfa) {
          setPhase("tfa");
          setMsg({
            kind: "err",
            text: "Two-factor authentication required. Enter your code below.",
          });
          return;
        }
        setMsg({ kind: "err", text: loginData.error ?? "Login failed." });
        return;
      }

      const newConfig = {
        apiKey: apiKey.trim(),
        managementToken: "",
        authToken: loginData.authToken,
        environment: environment.trim(),
        region,
      };
      const testRes = await fetch("/api/contentstack/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: newConfig }),
      });
      const testData = (await testRes.json()) as ContentstackTestResponse;

      if (!testData.ok) {
        setMsg({
          kind: "err",
          text: testData.error ?? "Stack connection failed.",
        });
        return;
      }
      setConfig(newConfig);
      setConnectionOk(
        true,
        testData.contentTypeCount,
        testData.stackName ?? null,
      );
      setMsg({
        kind: "ok",
        text: `Connected. ${testData.contentTypeCount ?? 0} content types found.`,
      });
    } catch (err) {
      setMsg({
        kind: "err",
        text: err instanceof Error ? err.message : "Network error.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canSubmit && !busy) void handleSubmit();
  };

  return (
    <div className="mx-auto mt-[2vh] flex max-w-[520px] flex-col gap-6 sm:mt-[4vh]">
      <div
        className={`${cardStatic} animate-fade-in overflow-hidden shadow-card-lg`}
      >
        <div
          className="h-1 w-full bg-accent"
          aria-hidden
        />

        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-muted px-2.5 py-1 font-mono text-[10px] font
            -medium uppercase tracking-wider text-accent">
              <KeyRound size={14} strokeWidth={2} aria-hidden /> Sign in
            </div>
            <h2 className="font-sans text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Connect to{" "}
              <span className="text-accent">Contentstack</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-[15px]">
              Use your Contentstack account. Session data is stored in{" "}
              <code className="rounded bg-paper-2 px-1 font-mono text-xs text-ink">
                localStorage
              </code>{" "}
              in this browser only.
            </p>
          </div>

          {phase === "credentials" ? (
            <div
              className="flex flex-col gap-4"
              onKeyDown={handleKeyDown}
            >
              <div>
                <label className={labelMono} htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  className={input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className={labelMono} htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  className={input}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className={labelMono} htmlFor="login-api-key">
                  Stack API Key
                </label>
                <input
                  id="login-api-key"
                  className={inputMono}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="blt1234567890abcdef"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelMono} htmlFor="login-env">
                    Environment
                  </label>
                  <input
                    id="login-env"
                    className={inputMono}
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    placeholder="development"
                  />
                </div>
                <div>
                  <label className={labelMono} htmlFor="login-region">
                    Region
                  </label>
                  <select
                    id="login-region"
                    className={inputMono}
                    value={region}
                    onChange={(e) => setRegion(e.target.value as Region)}
                  >
                    {REGIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="flex animate-fade-in flex-col gap-4"
              onKeyDown={handleKeyDown}
            >
              <div className="flex items-center gap-3 rounded-lg border border-accent/20 bg-accent-muted px-4 py-3">
                <ShieldCheck
                  size={22}
                  className="shrink-0 text-accent"
                  aria-hidden
                />
                <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted">
                  Two-factor authentication
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted">
                Enter the 6-digit code from your authenticator app to continue.
              </p>
              <div>
                <label className={labelMono} htmlFor="login-tfa">
                  Authentication code
                </label>
                <input
                  id="login-tfa"
                  className={`${inputMono} text-center text-xl tracking-[0.35em]`}
                  value={tfaToken}
                  onChange={(e) =>
                    setTfaToken(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  inputMode="numeric"
                  autoFocus
                  autoComplete="one-time-code"
                />
              </div>
              <button
                type="button"
                className={`${btnGhostSm} self-start`}
                onClick={() => {
                  setPhase("credentials");
                  setMsg(null);
                  setTfaToken("");
                }}
              >
                ← Back
              </button>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              className={btnPrimary}
              onClick={() => void handleSubmit()}
              disabled={!canSubmit || busy}
            >
              {busy ? (
                <>
                  <span className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {phase === "tfa" ? "Verifying…" : "Signing in…"}
                </>
              ) : phase === "tfa" ? (
                "Verify & connect"
              ) : (
                "Sign in"
              )}
            </button>
            {msg && (
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                  msg.kind === "ok" ? "text-brand-green" : "text-brand-red"
                }`}
                role={msg.kind === "err" ? "alert" : "status"}
              >
                {msg.kind === "ok" ? (
                  <Check size={14} aria-hidden />
                ) : (
                  <AlertCircle size={14} aria-hidden />
                )}
                {msg.text}
              </span>
            )}
          </div>

          <div className="mt-8 border-t border-line pt-6">
            <ul className="space-y-2 text-sm text-muted">
              <li className="flex gap-2">
                <span className="text-accent" aria-hidden>
                  ·
                </span>
                Contentstack account email and password
              </li>
              <li className="flex gap-2">
                <span className="text-accent" aria-hidden>
                  ·
                </span>
                Stack API key from Settings in Contentstack
              </li>
              <li className="flex gap-2">
                <span className="text-accent" aria-hidden>
                  ·
                </span>
                2FA is supported when enabled on your account
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
