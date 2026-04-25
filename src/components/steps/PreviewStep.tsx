"use client";

import { useMemo, useState, useId, useEffect, useRef } from "react";
import { Code2, Upload, X } from "lucide-react";
import { useStackshift } from "@/store";
import { entryTitle } from "@/lib/entry-title";
import type { DetectedField, MigrateResponse } from "@/types";
import {
  btnGhost,
  btnPrimaryLg,
  cardStatic,
  input,
  labelMono,
  stepEyebrow,
  stepLead,
  stepTitle,
} from "@/lib/ui";

const textareaCls = `${input} min-h-[88px] resize-y font-sans text-[15px] leading-relaxed`;

export default function PreviewStep() {
  const components = useStackshift((s) => s.components);
  const selectedIds = useStackshift((s) => s.selectedIds);
  const matches = useStackshift((s) => s.matches);
  const config = useStackshift((s) => s.config);
  const dryRun = useStackshift((s) => s.dryRun);
  const uploadAssets = useStackshift((s) => s.uploadAssets);
  const activeId = useStackshift((s) => s.activeComponentId);
  const selectedPageTypeUid = useStackshift((s) => s.selectedPageTypeUid);
  const pageComponentIds = useStackshift((s) => s.pageComponentIds);
  const pageEntryUrl = useStackshift((s) => s.pageEntryUrl);
  const pageEntryTitle = useStackshift((s) => s.pageEntryTitle);
  const setActive = useStackshift((s) => s.setActiveComponent);
  const updateField = useStackshift((s) => s.updateComponentField);
  const updateName = useStackshift((s) => s.updateComponentName);
  const setMigrationResult = useStackshift((s) => s.setMigrationResult);
  const setStep = useStackshift((s) => s.setStep);

  const modalTitleId = useId();
  const jsonDialogRef = useRef<HTMLDivElement>(null);
  const [pushing, setPushing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);

  const selectedComponents = useMemo(
    () => components.filter((c) => selectedIds.includes(c.id)),
    [components, selectedIds],
  );
  const active =
    selectedComponents.find((c) => c.id === activeId) ?? selectedComponents[0];

  const previewPayload = useMemo(() => {
    const payload = selectedComponents.reduce<Record<string, unknown>>(
      (acc, c) => {
        const ctUid =
          matches.find((m) => m.componentId === c.id)?.contentTypeUid ??
          c.suggestedUid;
        const entry: Record<string, unknown> = { title: entryTitle(c.name) };
        c.fields.forEach((f) => {
          if (f.uid !== "title") entry[f.uid] = f.value;
        });
        acc[ctUid] = entry;
        return acc;
      },
      {},
    );

    if (selectedPageTypeUid) {
      const modularBlocks = pageComponentIds.map((cid) => {
        const c = selectedComponents.find((x) => x.id === cid);
        const ctUid =
          matches.find((m) => m.componentId === cid)?.contentTypeUid ??
          c?.suggestedUid ??
          cid;
        return {
          [`${ctUid}_block`]: {
            [`${ctUid}_ref`]: [
              {
                _content_type_uid: ctUid,
                uid: "<entry-uid-assigned-at-migration>",
              },
            ],
          },
        };
      });
      payload[`${selectedPageTypeUid}__page_entry`] = {
        title: entryTitle(pageEntryTitle || "Page"),
        url: pageEntryUrl,
        modular_blocks: modularBlocks,
      };
    }

    return payload;
  }, [
    selectedComponents,
    matches,
    selectedPageTypeUid,
    pageComponentIds,
    pageEntryUrl,
    pageEntryTitle,
  ]);

  useEffect(() => {
    if (!jsonOpen) return;
    jsonDialogRef.current?.focus();
  }, [jsonOpen]);

  const handlePush = async () => {
    setErr(null);
    setPushing(true);
    try {
      const body = {
        config,
        components: selectedComponents,
        matches,
        dryRun,
        uploadAssets,
        pageTypeUid: selectedPageTypeUid ?? null,
        pageComponentIds,
        pageEntryUrl,
        pageEntryTitle,
      };
      const res = await fetch("/api/contentstack/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as MigrateResponse;
      setMigrationResult(data.result);
      setStep("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Push failed.");
    } finally {
      setPushing(false);
    }
  };

  return (
    <>
      <header className="mb-6 sm:mb-8">
        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <span className={stepEyebrow}>Preview</span>
        </div>
        <h2 className={stepTitle}>
          Review &amp; <span className="text-accent">tweak</span>.
        </h2>
        <p className={`${stepLead} mt-3 max-w-[42rem]`}>
          Everything below becomes entries in Contentstack. Edit inline, then
          push. Use dry-run on the URL step to inspect the payload without
          writing.
        </p>
      </header>

      <div
        className={`${cardStatic} flex flex-col overflow-hidden shadow-card-md lg:grid lg:min-h-[420px]`}
        style={{ gridTemplateColumns: "minmax(0,240px) 1fr" }}
      >
        <aside className="border-b border-line bg-paper-2 p-4 lg:border-b-0 lg:border-r lg:p-5">
          <h4 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-wider text-muted">
            Components ({selectedComponents.length})
          </h4>
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {selectedComponents.map((c, i) => (
              <li key={c.id} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  className={`flex w-full min-w-[140px] items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 lg:min-w-0 ${
                    active?.id === c.id
                      ? "border-accent bg-accent-muted text-ink ring-1 ring-accent/10"
                      : "border-line bg-card text-ink hover:border-line-strong hover:bg-paper-2"
                  }`}
                  onClick={() => setActive(c.id)}
                >
                  <span className="truncate">{c.name}</span>
                  <span className="ml-2 font-mono text-[10px] tabular-nums text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="min-w-0 p-5 sm:p-7 lg:overflow-y-auto">
          {active ? (
            <>
              <p className="mb-5 font-mono text-[10px] font-medium uppercase tracking-wider text-muted">
                {matches.find((m) => m.componentId === active.id)
                  ?.contentTypeUid ?? active.suggestedUid}
              </p>

              <div className="mb-6">
                <label className={labelMono} htmlFor={`entry-title-${active.id}`}>
                  Entry title
                </label>
                <input
                  id={`entry-title-${active.id}`}
                  className={input}
                  value={active.name}
                  onChange={(e) => updateName(active.id, e.target.value)}
                  placeholder="Entry title"
                />
                <span className="mt-1.5 block font-mono text-[11px] text-muted">
                  Sent as:{" "}
                  <strong className="text-ink">{entryTitle(active.name)}</strong>
                </span>
              </div>

              <div>
                {active.fields.map((f) => (
                  <FieldEditor
                    key={f.uid}
                    field={f}
                    onChange={(value) => updateField(active.id, f.uid, value)}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted">Select a component to edit.</p>
          )}
        </main>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          className={btnGhost}
          onClick={() => setJsonOpen(true)}
        >
          <Code2 size={16} strokeWidth={2} aria-hidden /> View JSON payload
        </button>
        <button
          type="button"
          className={btnPrimaryLg}
          onClick={() => void handlePush()}
          disabled={pushing}
        >
          {pushing ? (
            <>
              <span className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Pushing…
            </>
          ) : (
            <>
              <Upload size={16} strokeWidth={2} aria-hidden />{" "}
              {dryRun ? "Run dry-run" : "Push to Contentstack"}
            </>
          )}
        </button>
        {err && (
          <span className="text-sm text-brand-red" role="alert">
            {err}
          </span>
        )}
      </div>

      {jsonOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="presentation"
          onClick={() => setJsonOpen(false)}
        >
          <div
            ref={jsonDialogRef}
            tabIndex={-1}
            className={`flex max-h-[92vh] w-full max-w-[820px] flex-col ${cardStatic} shadow-scrim outline-none sm:max-h-[80vh]`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setJsonOpen(false);
            }}
          >
            <div className="flex items-center gap-2 border-b border-line bg-paper-2 px-3 py-2.5 sm:px-4">
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-[#ff5f57]"
                aria-hidden
              />
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-[#febc2e]"
                aria-hidden
              />
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-[#28c840]"
                aria-hidden
              />
              <span
                id={modalTitleId}
                className="ml-2 min-w-0 flex-1 truncate rounded-md border border-line bg-card px-2 py-1 font-mono text-[11px] text-muted"
              >
                payload.json
              </span>
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-paper-2 hover:text-ink"
                onClick={() => setJsonOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <pre className="m-0 flex-1 overflow-auto bg-[#0f172a] p-4 font-mono text-xs leading-relaxed text-emerald-100/95 sm:p-5">
              {JSON.stringify(previewPayload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </>
  );
}

function FieldEditor({
  field,
  onChange,
}: {
  field: DetectedField;
  onChange: (v: unknown) => void;
}) {
  const lbl = <span className={labelMono}>{field.displayName}</span>;
  switch (field.type) {
    case "single_line":
      return (
        <div className="mb-5">
          {lbl}
          <input
            className={input}
            value={(field.value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "multi_line":
    case "rich_text":
      return (
        <div className="mb-5">
          {lbl}
          <textarea
            className={textareaCls}
            value={
              typeof field.value === "string"
                ? field.value
                : JSON.stringify(field.value)
            }
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "url": {
      const v = (field.value as { title?: string; href?: string }) ?? {};
      return (
        <div className="mb-5">
          {lbl}
          <input
            className={input}
            value={v.title ?? ""}
            placeholder="Title"
            onChange={(e) => onChange({ ...v, title: e.target.value })}
          />
          <input
            className={`${input} mt-2`}
            value={v.href ?? ""}
            placeholder="https://…"
            onChange={(e) => onChange({ ...v, href: e.target.value })}
          />
        </div>
      );
    }
    case "file":
      return (
        <div className="mb-5">
          <span className={labelMono}>{field.displayName} — asset URL</span>
          <input
            className={input}
            value={(field.value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "group":
      return (
        <div className="mb-5">
          {lbl}
          <p className="mb-2 text-xs text-muted">
            {(field.value as unknown[])?.length ?? 0} items (JSON)
          </p>
          <textarea
            className={`${textareaCls} font-mono text-xs`}
            value={JSON.stringify(field.value, null, 2)}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                /* ignore while typing */
              }
            }}
          />
        </div>
      );
    default:
      return (
        <div className="mb-5">
          {lbl}
          <input
            className={input}
            value={String(field.value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
  }
}
