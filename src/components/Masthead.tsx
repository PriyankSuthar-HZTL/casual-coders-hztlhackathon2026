"use client";

import { Settings, LogOut, CircleDot, Bot } from "lucide-react";
import { useStackshift } from "@/store";
import { iconButton } from "@/lib/ui";

export default function Masthead() {
  const connectionOk = useStackshift((s) => s.connectionOk);
  const contentTypeCount = useStackshift((s) => s.contentTypeCount);
  const region = useStackshift((s) => s.config.region);
  const stackName = useStackshift((s) => s.stackName);
  const connectedAt = useStackshift((s) => s.connectedAt);
  const setConfigPanelOpen = useStackshift((s) => s.setConfigPanelOpen);
  const setLlmPanelOpen = useStackshift((s) => s.setLlmPanelOpen);
  const llmEnabled = useStackshift((s) => s.llmConfig.enabled);
  const disconnect = useStackshift((s) => s.disconnect);

  const shortStack = stackName
    ? stackName.length > 22
      ? `${stackName.slice(0, 22)}…`
      : stackName
    : region.toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/80 backdrop-blur-xl backdrop-saturate-150 ">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-5 lg:px-12">
        <div className="min-w-0">
          <h1 className="font-sans text-3xl font-semibold tracking-tight text-ink sm:text-[2.35rem] sm:leading-none">
            Migrate<span className="text-accent">X</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted sm:text-[13px]">
            Migrate live pages into Contentstack — scan, map, and push entries in one flow.
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          {connectionOk ? (
            <div className="flex w-full min-w-0 flex-col gap-3 rounded-xl border border-line bg-card px-3 py-3 shadow-card sm:inline-flex sm:w-auto sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="inline-flex shrink-0 text-brand-green"
                  aria-hidden
                >
                  <CircleDot size={12} strokeWidth={2.5} />
                </span>
                <div className="min-w-0 leading-snug">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                    Connected
                  </span>
                  <p className="truncate text-[13px] font-medium text-ink">
                    {shortStack} · {region.toUpperCase()} ·{" "}
                    {contentTypeCount ?? 0} types
                    {connectedAt ? ` · ${timeAgo(connectedAt)}` : ""}
                  </p>
                </div>
              </div>
              <div
                className="flex items-center gap-1 border-t border-line pt-2 sm:border-t-0 sm:border-l sm:border-line sm:pt-0 sm:pl-3"
                role="group"
                aria-label="Connection actions"
              >
                <button
                  type="button"
                  className={`${iconButton} relative ${llmEnabled ? "text-brand-green" : "text-ink"}`}
                  title="AI detection settings"
                  aria-label="AI detection settings"
                  aria-pressed={llmEnabled}
                  onClick={() => setLlmPanelOpen(true)}
                >
                  <Bot size={16} strokeWidth={2} />
                  {llmEnabled && (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-brand-green ring-2 ring-card" />
                  )}
                </button>
                <button
                  type="button"
                  className={iconButton}
                  title="Manage connection"
                  aria-label="Manage connection"
                  onClick={() => setConfigPanelOpen(true)}
                >
                  <Settings size={16} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className={iconButton}
                  title="Sign out"
                  aria-label="Sign out"
                  onClick={() => {
                    if (
                      confirm(
                        "Disconnect and clear saved credentials from this browser?",
                      )
                    )
                      disconnect();
                  }}
                >
                  <LogOut size={16} strokeWidth={2} />
                </button>
              </div>
            </div>
          ) : (
            <div className="inline-flex w-full items-center gap-3 rounded-xl border border-dashed border-line-strong bg-paper-2 px-4 py-3 sm:w-auto">
              <span className="inline-flex shrink-0 text-accent" aria-hidden>
                <CircleDot size={12} strokeWidth={2.5} />
              </span>
              <div className="leading-snug">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                  Not connected
                </span>
                <p className="text-[13px] font-medium text-ink">
                  Sign in to begin migrating
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function timeAgo(ts: number): string {
  const delta = Math.max(0, Date.now() - ts);
  const min = Math.floor(delta / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
