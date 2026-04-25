"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Link2,
  Loader2,
  RefreshCw,
  Ticket,
} from "lucide-react";
import { formatConfluenceTitle, formatJiraSummary } from "@/lib/integration-titles";
import { useStackshift } from "@/store";
import type {
  AtlassianConnectResponse,
  IntegrationComponentDraft,
  IntegrationComponentResult,
  IntegrationComponentSyncState,
  IntegrationGenerateResponse,
  IntegrationSubmitResponse,
} from "@/types";
import {
  btnGhost,
  btnPrimary,
  btnPrimaryLg,
  cardStatic,
  input,
  labelMono,
  stepEyebrow,
  stepLead,
  stepTitle,
} from "@/lib/ui";

const inputMono = `${input} font-mono text-xs`;
const textareaCls = `${input} min-h-[140px] resize-y font-mono text-xs leading-relaxed`;

type CreationRowStatus = "pending" | "in_progress" | "success" | "failed";

function isFullySynced(
  sync: IntegrationComponentSyncState,
  createJira: boolean,
  createConfluence: boolean,
): boolean {
  if (createJira && !sync.jiraKey) return false;
  if (createConfluence && !sync.confluencePageId) return false;
  return true;
}

function rowMeetsTargets(
  row: IntegrationComponentResult | undefined,
  createJira: boolean,
  createConfluence: boolean,
): boolean {
  if (!row) return false;
  if (createJira && row.jira?.ok !== true) return false;
  if (createConfluence && row.confluence?.ok !== true) return false;
  return true;
}

export default function IntegrationsStep() {
  const components = useStackshift((s) => s.components);
  const selectedIds = useStackshift((s) => s.selectedIds);
  const url = useStackshift((s) => s.url);
  const llmConfig = useStackshift((s) => s.llmConfig);
  const setStep = useStackshift((s) => s.setStep);

  const atlassianConfig = useStackshift((s) => s.atlassianConfig);
  const atlassianConnected = useStackshift((s) => s.atlassianConnected);
  const jiraProjects = useStackshift((s) => s.jiraProjects);
  const confluenceSpaces = useStackshift((s) => s.confluenceSpaces);
  const selectedJiraProjectId = useStackshift((s) => s.selectedJiraProjectId);
  const selectedConfluenceSpaceKey = useStackshift(
    (s) => s.selectedConfluenceSpaceKey,
  );
  const integrationSyncByComponentId = useStackshift(
    (s) => s.integrationSyncByComponentId,
  );
  const setAtlassianConfig = useStackshift((s) => s.setAtlassianConfig);
  const setAtlassianConnected = useStackshift((s) => s.setAtlassianConnected);
  const setJiraProjects = useStackshift((s) => s.setJiraProjects);
  const setConfluenceSpaces = useStackshift((s) => s.setConfluenceSpaces);
  const setSelectedJiraProjectId = useStackshift((s) => s.setSelectedJiraProjectId);
  const setSelectedConfluenceSpaceKey = useStackshift(
    (s) => s.setSelectedConfluenceSpaceKey,
  );
  const disconnectAtlassian = useStackshift((s) => s.disconnectAtlassian);
  const mergeIntegrationSync = useStackshift((s) => s.mergeIntegrationSync);

  const selectedComponents = useMemo(
    () => components.filter((c) => selectedIds.includes(c.id)),
    [components, selectedIds],
  );

  const [createJira, setCreateJira] = useState(true);
  const [createConfluence, setCreateConfluence] = useState(true);
  const [componentDrafts, setComponentDrafts] = useState<
    IntegrationComponentDraft[]
  >([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);
  const [result, setResult] = useState<IntegrationSubmitResponse | null>(null);
  /** Bumps when drafts are regenerated — resets run / proceed state. */
  const [draftNonce, setDraftNonce] = useState(0);
  const [creationStatusById, setCreationStatusById] = useState<
    Record<string, CreationRowStatus>
  >({});
  /** True after a submit where every required target succeeded for every row. */
  const [integrationRunSucceeded, setIntegrationRunSucceeded] = useState(false);
  const [submitNetworkError, setSubmitNetworkError] = useState<string | null>(null);

  const selectionKey = useMemo(
    () => [...selectedIds].sort().join(","),
    [selectedIds],
  );

  useEffect(() => {
    setIntegrationRunSucceeded(false);
    setCreationStatusById({});
    setResult(null);
    setSubmitNetworkError(null);
  }, [selectionKey, createJira, createConfluence, draftNonce]);

  const draftsForSubmit = useMemo(
    () =>
      selectedComponents
        .map((c) => componentDrafts.find((d) => d.componentId === c.id))
        .filter((d): d is IntegrationComponentDraft => !!d),
    [selectedComponents, componentDrafts],
  );

  const draftsMatchSelection =
    selectedComponents.length > 0 &&
    draftsForSubmit.length === selectedComponents.length;

  const canConnect =
    atlassianConfig.siteUrl.trim() &&
    atlassianConfig.email.trim() &&
    atlassianConfig.apiToken.trim() &&
    (createJira || createConfluence);

  const canSubmit =
    atlassianConnected &&
    (createJira || createConfluence) &&
    draftsMatchSelection &&
    (!createJira || !!selectedJiraProjectId) &&
    (!createConfluence || !!selectedConfluenceSpaceKey);

  const allAlreadySyncedForSelection = useMemo(() => {
    if (!draftsMatchSelection || !draftsForSubmit.length) return false;
    return draftsForSubmit.every((d) =>
      isFullySynced(
        integrationSyncByComponentId[d.componentId] ?? {},
        createJira,
        createConfluence,
      ),
    );
  }, [
    draftsMatchSelection,
    draftsForSubmit,
    integrationSyncByComponentId,
    createJira,
    createConfluence,
  ]);

  const hasFailedRow = useMemo(
    () => Object.values(creationStatusById).some((s) => s === "failed"),
    [creationStatusById],
  );

  /** Proceed only after a successful sync run in this session (includes all-skipped OK). */
  const canContinueToMatch =
    !submitting &&
    draftsMatchSelection &&
    draftsForSubmit.length > 0 &&
    integrationRunSucceeded &&
    !hasFailedRow;

  const needsConfirmSync =
    allAlreadySyncedForSelection &&
    !integrationRunSucceeded &&
    !hasFailedRow &&
    draftsMatchSelection &&
    !submitting;

  const effectiveRowStatus = (componentId: string): CreationRowStatus =>
    creationStatusById[componentId] ?? "pending";

  const updateDraft = (
    componentId: string,
    patch: {
      jiraDescription?: string;
      confluenceContent?: string;
    },
  ) => {
    setComponentDrafts((rows) =>
      rows.map((row) => {
        if (row.componentId !== componentId) return row;
        return {
          ...row,
          jiraDraft: patch.jiraDescription
            ? { ...row.jiraDraft, description: patch.jiraDescription }
            : row.jiraDraft,
          confluenceDraft: patch.confluenceContent
            ? { ...row.confluenceDraft, content: patch.confluenceContent }
            : row.confluenceDraft,
        };
      }),
    );
  };

  const generateDrafts = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          components: selectedComponents,
          llmConfig: llmConfig.enabled ? llmConfig : undefined,
        }),
      });
      const data = (await res.json()) as IntegrationGenerateResponse;
      if (!data.ok || !data.componentDrafts?.length) {
        setComponentDrafts([]);
        setMessage({
          kind: "err",
          text: data.error ?? "Failed to generate per-component drafts.",
        });
        return false;
      }
      setComponentDrafts(data.componentDrafts);
      setDraftNonce((n) => n + 1);
      return true;
    } catch (err) {
      setComponentDrafts([]);
      setMessage({
        kind: "err",
        text: err instanceof Error ? err.message : "Network error.",
      });
      return false;
    } finally {
      setGenerating(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setMessage(null);
    setResult(null);
    try {
      const res = await fetch("/api/integrations/atlassian/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: atlassianConfig,
          includeJira: createJira,
          includeConfluence: createConfluence,
        }),
      });
      const data = (await res.json()) as AtlassianConnectResponse;
      if (!data.ok) {
        setAtlassianConnected(false);
        setMessage({
          kind: "err",
          text: data.error ?? "Could not connect to Jira/Confluence.",
        });
        return;
      }

      setAtlassianConnected(true);
      setJiraProjects(data.jiraProjects);
      setConfluenceSpaces(data.confluenceSpaces);
      setSelectedJiraProjectId(data.jiraProjects[0]?.id ?? null);
      setSelectedConfluenceSpaceKey(data.confluenceSpaces[0]?.key ?? null);

      const generated = await generateDrafts();
      setMessage({
        kind: generated ? "ok" : "err",
        text: generated
          ? "Connected. One Jira + one Confluence draft per selected component."
          : "Connected, but draft generation failed.",
      });
    } catch (err) {
      setAtlassianConnected(false);
      setMessage({
        kind: "err",
        text: err instanceof Error ? err.message : "Network error.",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage(null);
    setResult(null);
    setSubmitNetworkError(null);
    setIntegrationRunSucceeded(false);
    const ids = draftsForSubmit.map((d) => d.componentId);
    setCreationStatusById(
      Object.fromEntries(ids.map((id) => [id, "in_progress" as const])),
    );
    try {
      const items = draftsForSubmit.map((d) => {
        const comp = components.find((c) => c.id === d.componentId);
        const name = comp?.name.trim() || comp?.kind || d.componentName;
        return {
          componentId: d.componentId,
          componentName: name,
          jiraDraft: createJira
            ? {
                summary: formatJiraSummary(name),
                description: d.jiraDraft.description,
              }
            : undefined,
          confluenceDraft: createConfluence
            ? {
                title: formatConfluenceTitle(name),
                content: d.confluenceDraft.content,
              }
            : undefined,
        };
      });

      const res = await fetch("/api/integrations/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: atlassianConfig,
          createJira,
          createConfluence,
          jiraProjectId: selectedJiraProjectId ?? undefined,
          confluenceSpaceKey: selectedConfluenceSpaceKey ?? undefined,
          items,
          existingSync: integrationSyncByComponentId,
        }),
      });
      const data = (await res.json()) as IntegrationSubmitResponse;
      setResult(data);

      const nextStatus: Record<string, CreationRowStatus> = {};
      for (const id of ids) {
        const row = data.components?.find((c) => c.componentId === id);
        nextStatus[id] = rowMeetsTargets(row, createJira, createConfluence)
          ? "success"
          : "failed";
      }
      setCreationStatusById(nextStatus);
      setIntegrationRunSucceeded(!!data.ok);

      for (const row of data.components ?? []) {
        const patch: {
          jiraKey?: string;
          jiraUrl?: string;
          confluencePageId?: string;
          confluenceUrl?: string;
        } = {};
        if (row.jira?.ok && row.jira.id && !row.jira.skipped) {
          patch.jiraKey = row.jira.id;
          patch.jiraUrl = row.jira.url;
        }
        if (row.confluence?.ok && row.confluence.id && !row.confluence.skipped) {
          patch.confluencePageId = row.confluence.id;
          patch.confluenceUrl = row.confluence.url;
        }
        if (
          patch.jiraKey ||
          patch.confluencePageId ||
          patch.jiraUrl ||
          patch.confluenceUrl
        ) {
          mergeIntegrationSync(row.componentId, patch);
        }
      }

      setMessage({
        kind: data.ok ? "ok" : "err",
        text: data.ok
          ? "All components synced to Jira/Confluence."
          : "One or more components failed. Fix issues below, then retry sync before continuing.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed.";
      setCreationStatusById(
        Object.fromEntries(ids.map((id) => [id, "failed" as const])),
      );
      setIntegrationRunSucceeded(false);
      setSubmitNetworkError(msg);
      setMessage({
        kind: "err",
        text: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const failedResultRows = useMemo(() => {
    if (!result?.components?.length || result.ok) return [];
    return result.components.filter(
      (r) => !rowMeetsTargets(r, createJira, createConfluence),
    );
  }, [result, createJira, createConfluence]);

  const expandFirstFailed = () => {
    const first = failedResultRows[0]?.componentId;
    if (first) setExpandedId(first);
  };

  return (
    <>
      <header className="mb-6 sm:mb-8">
        <span className={stepEyebrow}>Integrations</span>
        <h2 className={`${stepTitle} mt-2`}>
          Per-component <span className="text-accent">Jira &amp; Confluence</span>.
        </h2>
        <p className={`${stepLead} mt-3 max-w-[44rem]`}>
          Each selected block gets its own Jira task and its own Confluence page (no batching).
          Titles follow a fixed pattern from the detected component name. Enable either tool or both;
          when both run, links are written both ways.
        </p>
      </header>

      <div className={`${cardStatic} p-5 shadow-card-md sm:p-7`}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
          <div>
            <p className={labelMono}>Integration entry point</p>
            <p className="text-sm text-muted">
              Selected components:{" "}
              <span className="font-mono text-ink">{selectedComponents.length}</span>
            </p>
          </div>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => void handleConnect()}
            disabled={!canConnect || connecting}
          >
            {connecting ? (
              <>
                <span className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <Link2 size={16} aria-hidden /> Connect to Jira/Confluence
              </>
            )}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className={labelMono} htmlFor="atlassian-site-url">
              Atlassian site URL
            </label>
            <input
              id="atlassian-site-url"
              className={inputMono}
              value={atlassianConfig.siteUrl}
              onChange={(e) => setAtlassianConfig({ siteUrl: e.target.value })}
              placeholder="https://your-team.atlassian.net"
            />
          </div>
          <div>
            <label className={labelMono} htmlFor="atlassian-email">
              Email
            </label>
            <input
              id="atlassian-email"
              className={input}
              value={atlassianConfig.email}
              onChange={(e) => setAtlassianConfig({ email: e.target.value })}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className={labelMono} htmlFor="atlassian-api-token">
              API token
            </label>
            <input
              id="atlassian-api-token"
              type="password"
              className={inputMono}
              value={atlassianConfig.apiToken}
              onChange={(e) => setAtlassianConfig({ apiToken: e.target.value })}
              placeholder="ATATT3x..."
            />
          </div>
          <div className="rounded-lg border border-line bg-paper-2 p-3">
            <p className={labelMono}>Targets</p>
            <label className="mb-2 flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={createJira}
                onChange={() => setCreateJira((v) => !v)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-accent"
              />
              Create Jira ticket per component
            </label>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={createConfluence}
                onChange={() => setCreateConfluence((v) => !v)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-accent"
              />
              Create Confluence page per component
            </label>
          </div>
        </div>

        {atlassianConnected && (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-green-muted px-3 py-2.5 text-sm text-brand-green">
            Workspace connected. Drafts are generated per selected component; submit to create
            issues/pages (already-synced components are skipped automatically).
          </div>
        )}

        {!draftsMatchSelection && atlassianConnected && selectedComponents.length > 0 && (
          <p className="mt-3 text-sm text-brand-yellow" role="status">
            Selection changed since last generate — click &quot;Regenerate&quot; before submitting.
          </p>
        )}

        {message && (
          <div
            className={`mt-4 inline-flex items-center gap-1.5 text-sm ${
              message.kind === "ok" ? "text-brand-green" : "text-brand-red"
            }`}
            role={message.kind === "err" ? "alert" : "status"}
          >
            {message.kind === "ok" ? (
              <CheckCircle2 size={15} aria-hidden />
            ) : (
              <AlertCircle size={15} aria-hidden />
            )}
            {message.text}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className={btnGhost}
            onClick={() => void generateDrafts()}
            disabled={!atlassianConnected || generating || !selectedComponents.length}
          >
            {generating ? (
              <>
                <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-ink/25 border-t-ink animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <RefreshCw size={14} aria-hidden /> Regenerate per-component drafts
              </>
            )}
          </button>
          {atlassianConnected && (
            <button type="button" className={btnGhost} onClick={disconnectAtlassian}>
              Disconnect workspace
            </button>
          )}
        </div>
      </div>

      {(createJira || createConfluence) && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {createJira && (
            <div className={`${cardStatic} p-4 sm:p-5`}>
              <p className={labelMono}>Jira project</p>
              <select
                className={`${inputMono} mt-2`}
                value={selectedJiraProjectId ?? ""}
                onChange={(e) => setSelectedJiraProjectId(e.target.value || null)}
              >
                {jiraProjects.length === 0 ? (
                  <option value="">No projects loaded</option>
                ) : (
                  jiraProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.key} - {p.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
          {createConfluence && (
            <div className={`${cardStatic} p-4 sm:p-5`}>
              <p className={labelMono}>Confluence space</p>
              <select
                className={`${inputMono} mt-2`}
                value={selectedConfluenceSpaceKey ?? ""}
                onChange={(e) =>
                  setSelectedConfluenceSpaceKey(e.target.value || null)
                }
              >
                {confluenceSpaces.length === 0 ? (
                  <option value="">No spaces loaded</option>
                ) : (
                  confluenceSpaces.map((s) => (
                    <option key={s.id} value={s.key}>
                      {s.key} - {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
        </div>
      )}

      {componentDrafts.length > 0 && (
        <div className={`${cardStatic} mt-6 overflow-hidden shadow-card-md`}>
          <div className="border-b border-line bg-paper-2 px-4 py-3 sm:px-5">
            <h3 className="font-sans text-base font-semibold text-ink">
              Per-component drafts
            </h3>
            <p className="mt-1 text-xs text-muted">
              Jira: <code className="font-mono text-[11px]">[Name] - Implementation / Review Task</code>
              {" · "}
              Confluence:{" "}
              <code className="font-mono text-[11px]">[Name] - Technical Documentation</code>
            </p>
          </div>
          <div className="divide-y divide-line">
            {draftsForSubmit.map((d) => {
              const comp = components.find((c) => c.id === d.componentId);
              const name = comp?.name.trim() || comp?.kind || d.componentName;
              const sync = integrationSyncByComponentId[d.componentId] ?? {};
              const expanded = expandedId === d.componentId;
              const rowStatus = effectiveRowStatus(d.componentId);
              const storedHint =
                (createJira && !!sync.jiraKey) || (createConfluence && !!sync.confluencePageId)
                  ? "Stored artifacts exist — run sync to refresh status."
                  : null;
              return (
                <div key={d.componentId} className="bg-card">
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-4 py-3 text-left sm:px-5 sm:py-4"
                    onClick={() => setExpandedId(expanded ? null : d.componentId)}
                  >
                    <span className="mt-0.5 shrink-0 text-muted">
                      {expanded ? (
                        <ChevronDown size={16} aria-hidden />
                      ) : (
                        <ChevronRight size={16} aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-ink">{name}</span>
                      <span className="mt-1 block font-mono text-[10px] text-muted">
                        {createJira && (
                          <span className="mr-2 inline-flex items-center gap-1">
                            <Ticket size={11} aria-hidden />
                            {formatJiraSummary(name)}
                          </span>
                        )}
                        {createConfluence && (
                          <span className="inline-flex items-center gap-1">
                            <FileText size={11} aria-hidden />
                            {formatConfluenceTitle(name)}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <RowStatusBadge status={rowStatus} />
                      {storedHint && rowStatus === "pending" && (
                        <span className="max-w-[140px] text-right font-mono text-[8px] font-normal normal-case leading-tight text-muted">
                          {storedHint}
                        </span>
                      )}
                    </span>
                  </button>
                  {expanded && (
                    <div className="space-y-4 border-t border-line bg-paper-2/50 px-4 py-4 sm:px-6 sm:py-5">
                      {createJira && (
                        <div>
                          <label className={labelMono} htmlFor={`jira-desc-${d.componentId}`}>
                            Jira description (editable)
                          </label>
                          <textarea
                            id={`jira-desc-${d.componentId}`}
                            className={textareaCls}
                            value={d.jiraDraft.description}
                            onChange={(e) =>
                              updateDraft(d.componentId, {
                                jiraDescription: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}
                      {createConfluence && (
                        <div>
                          <label
                            className={labelMono}
                            htmlFor={`cf-body-${d.componentId}`}
                          >
                            Confluence body (editable)
                          </label>
                          <textarea
                            id={`cf-body-${d.componentId}`}
                            className={textareaCls}
                            value={d.confluenceDraft.content}
                            onChange={(e) =>
                              updateDraft(d.componentId, {
                                confluenceContent: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {draftsForSubmit.length > 0 && (
        <SyncStatusSummary
          draftsForSubmit={draftsForSubmit}
          creationStatusById={creationStatusById}
          submitting={submitting}
        />
      )}

      {needsConfirmSync && (
        <div
          className="mt-5 rounded-lg border border-amber-200 bg-yellow-soft px-4 py-3 text-sm text-brand-yellow"
          role="status"
        >
          Jira and Confluence entries already exist for every selected component. Run{" "}
          <strong className="font-medium">Create / update</strong> once to confirm they are still
          valid, then you can continue to matching.
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          className={btnPrimary}
          onClick={() => void handleSubmit()}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <>
              <span className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Syncing…
            </>
          ) : (
            <>
              Create / update per component
              <ArrowRight size={14} aria-hidden />
            </>
          )}
        </button>

        <button type="button" className={btnGhost} onClick={() => setStep("match")}>
          Skip for now and continue to matching
        </button>
      </div>

      {submitNetworkError && (
        <div
          className={`${cardStatic} mt-5 border-red-200 bg-red-soft/40 p-4 shadow-card-md sm:p-5`}
          role="alert"
        >
          <p className={labelMono}>Network / request error</p>
          <p className="mt-2 text-sm text-brand-red">{submitNetworkError}</p>
          <button
            type="button"
            className={`${btnPrimary} mt-4`}
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || submitting}
          >
            <RefreshCw size={14} aria-hidden /> Retry sync
          </button>
        </div>
      )}

      {failedResultRows.length > 0 && (
        <div
          className={`${cardStatic} mt-5 border-red-200 bg-red-soft/40 p-4 shadow-card-md sm:p-5`}
          role="alert"
        >
          <p className={labelMono}>Sync errors — resolve before continuing</p>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-brand-red">
            {failedResultRows.map((r) => (
              <li key={r.componentId}>
                <span className="font-medium text-ink">
                  {r.componentName ?? r.componentId}
                </span>
                {createJira && r.jira && !r.jira.ok && (
                  <span className="block pl-4 font-mono text-[11px]">
                    Jira: {r.jira.error ?? "failed"}
                  </span>
                )}
                {createConfluence && r.confluence && !r.confluence.ok && (
                  <span className="block pl-4 font-mono text-[11px]">
                    Confluence: {r.confluence.error ?? "failed"}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={btnPrimary}
              onClick={() => void handleSubmit()}
              disabled={!canSubmit || submitting}
            >
              <RefreshCw size={14} aria-hidden /> Retry sync
            </button>
            <button type="button" className={btnGhost} onClick={expandFirstFailed}>
              Expand first failed row
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          className={btnPrimaryLg}
          onClick={() => setStep("match")}
          disabled={!canContinueToMatch}
        >
          Continue to matching
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </button>
        {!canContinueToMatch && !submitting && draftsForSubmit.length > 0 && (
          <span className="max-w-md text-sm text-muted">
            {!integrationRunSucceeded
              ? "Run Create / update successfully for every selected component (Step 1–2). This button stays disabled until then."
              : null}
          </span>
        )}
      </div>

      {result?.components && result.components.length > 0 && (
        <div className={`${cardStatic} mt-5 p-4 shadow-card-md sm:p-5`}>
          <p className={labelMono}>Last run — per component</p>
          <ul className="mt-3 space-y-3 text-sm">
            {result.components.map((r) => (
              <li
                key={r.componentId}
                className="rounded-lg border border-line bg-paper-2 px-3 py-2"
              >
                <div className="font-medium text-ink">
                  {r.componentName ?? r.componentId}
                </div>
                {r.jira && (
                  <div
                    className={
                      r.jira.ok ? "mt-1 text-brand-green" : "mt-1 text-brand-red"
                    }
                  >
                    Jira:{" "}
                    {r.jira.skipped
                      ? `skipped (existing ${r.jira.id ?? ""})`
                      : r.jira.ok
                        ? (
                            <>
                              <strong>{r.jira.id}</strong>
                              {r.jira.url && (
                                <>
                                  {" "}
                                  —{" "}
                                  <a
                                    href={r.jira.url}
                                    className="underline"
                                    target="_blank"
                                    rel="noreferrer noopener"
                                  >
                                    open
                                  </a>
                                </>
                              )}
                            </>
                          )
                        : r.jira.error}
                  </div>
                )}
                {r.confluence && (
                  <div
                    className={
                      r.confluence.ok
                        ? "mt-1 text-brand-green"
                        : "mt-1 text-brand-red"
                    }
                  >
                    Confluence:{" "}
                    {r.confluence.skipped
                      ? `skipped (existing ${r.confluence.id ?? ""})`
                      : r.confluence.ok
                        ? (
                            <>
                              <strong>{r.confluence.id}</strong>
                              {r.confluence.url && (
                                <>
                                  {" "}
                                  —{" "}
                                  <a
                                    href={r.confluence.url}
                                    className="underline"
                                    target="_blank"
                                    rel="noreferrer noopener"
                                  >
                                    open
                                  </a>
                                </>
                              )}
                            </>
                          )
                        : r.confluence.error}
                  </div>
                )}
                {r.log && r.log.length > 0 && (
                  <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-muted">
                    {r.log.join("\n")}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function RowStatusBadge({ status }: { status: CreationRowStatus }) {
  const config: Record<
    CreationRowStatus,
    { label: string; cls: string }
  > = {
    pending: {
      label: "Pending",
      cls: "border-line bg-paper-2 text-muted",
    },
    in_progress: {
      label: "In progress",
      cls: "border-accent/30 bg-accent-muted text-accent",
    },
    success: {
      label: "Success",
      cls: "border-emerald-200 bg-green-muted text-brand-green",
    },
    failed: {
      label: "Failed",
      cls: "border-red-200 bg-red-soft text-brand-red",
    },
  };
  const { label, cls } = config[status];
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {status === "in_progress" && (
        <Loader2 className="mr-1 h-3 w-3 shrink-0 animate-spin" aria-hidden />
      )}
      {label}
    </span>
  );
}

function SyncStatusSummary({
  draftsForSubmit,
  creationStatusById,
  submitting,
}: {
  draftsForSubmit: IntegrationComponentDraft[];
  creationStatusById: Record<string, CreationRowStatus>;
  submitting: boolean;
}) {
  const counts = useMemo(() => {
    const c = {
      pending: 0,
      in_progress: 0,
      success: 0,
      failed: 0,
    };
    for (const d of draftsForSubmit) {
      const s = creationStatusById[d.componentId] ?? "pending";
      c[s] += 1;
    }
    return c;
  }, [draftsForSubmit, creationStatusById]);

  const stepLabel = submitting
    ? "Step 2: Sync in progress"
    : counts.failed > 0
      ? "Step 2: Sync finished with errors"
      : counts.success === draftsForSubmit.length && draftsForSubmit.length > 0
        ? "Step 2: All components synced"
        : "Step 2: Awaiting sync";

  return (
    <div className={`${cardStatic} mt-6 p-4 shadow-card-md sm:p-5`}>
      <p className={labelMono}>Creation status</p>
      <p className="mt-2 text-sm font-medium text-ink">{stepLabel}</p>
      <div className="mt-3 flex flex-wrap gap-3 font-mono text-[11px] text-muted">
        <span>Pending: {counts.pending}</span>
        <span>In progress: {counts.in_progress}</span>
        <span className="text-brand-green">Success: {counts.success}</span>
        <span className="text-brand-red">Failed: {counts.failed}</span>
      </div>
    </div>
  );
}
