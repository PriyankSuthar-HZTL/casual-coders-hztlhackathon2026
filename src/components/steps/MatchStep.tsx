"use client";

import { Fragment, useState } from "react";
import { Sparkles, ArrowRight, GripVertical } from "lucide-react";
import { useStackshift } from "@/store";
import type {
  CreateContentTypeResponse,
  DetectedComponent,
  FieldType,
  MatchResult,
} from "@/types";
import {
  btnGhost,
  btnPrimary,
  btnSecondary,
  cardStatic,
  stepEyebrow,
  stepLead,
  stepTitle,
} from "@/lib/ui";

const TYPE_LABEL: Record<FieldType, string> = {
  single_line: "single-line",
  multi_line: "multi-line",
  rich_text: "rich-text",
  url: "link",
  file: "file",
  boolean: "boolean",
  number: "number",
  group: "group",
  reference: "ref",
};

export default function MatchStep() {
  const components = useStackshift((s) => s.components);
  const selectedIds = useStackshift((s) => s.selectedIds);
  const matches = useStackshift((s) => s.matches);
  const config = useStackshift((s) => s.config);
  const setStep = useStackshift((s) => s.setStep);
  const setMatchResolved = useStackshift((s) => s.setMatchResolved);
  const dryRun = useStackshift((s) => s.dryRun);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const selectedComponents = components.filter((c) =>
    selectedIds.includes(c.id),
  );
  const allResolved = matches.every(
    (m) => m.status === "matched" || m.status === "partial",
  );

  const handleCreate = async (c: DetectedComponent) => {
    setErr(null);
    setCreatingId(c.id);
    try {
      const res = await fetch("/api/contentstack/create-content-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, component: c }),
      });
      const data = (await res.json()) as CreateContentTypeResponse;
      if (!data.ok || !data.contentType) {
        setErr(data.error ?? "Failed to create content type.");
        return;
      }
      setMatchResolved(c.id, data.contentType.uid, data.contentType.title);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error.");
    } finally {
      setCreatingId(null);
    }
  };

  return (
    <>
      <header className="mb-6 sm:mb-8">
        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <span className={stepEyebrow}>Match</span>
        </div>
        <h2 className={stepTitle}>
          Map to Contentstack <span className="text-accent">types</span>.
        </h2>
        <p className={`${stepLead} mt-3 max-w-[42rem]`}>
          We match each component to a content type. Create missing types in
          one click — schema is inferred from detected fields.
        </p>
      </header>

      {dryRun && (
        <div
          className="mb-6 rounded-lg border border-amber-200 bg-yellow-soft px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-wide text-brand-yellow"
          role="status"
        >
          Dry-run mode — content type creation is disabled. Nothing will be
          written.
        </div>
      )}

      <div className={`${cardStatic} overflow-x-auto shadow-card-md`}>
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-2">
              {[
                "Detected component",
                "Contentstack type",
                "Status",
                "Action",
              ].map((h, i) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-4 py-3.5 font-mono text-[10px] font-medium uppercase tracking-wider text-muted sm:px-5"
                  style={i === 3 ? { width: 240 } : undefined}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {selectedComponents.map((c) => {
              const match = matches.find((m) => m.componentId === c.id);
              if (!match) return null;
              const open = expanded === c.id;
              return (
                <Fragment key={c.id}>
                  <tr className="border-b border-line/60 transition-colors hover:bg-paper-2/80">
                    <td className="px-4 py-4 align-middle sm:px-5">
                      <div className="font-semibold text-ink">{c.name}</div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                        {c.suggestedUid}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle text-muted sm:px-5">
                      <span className="mr-2 font-mono text-muted-soft">→</span>
                      {match.contentTypeTitle ?? (
                        <span className="text-muted-soft">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 align-middle sm:px-5">
                      <MatchBadge status={match.status} />
                    </td>
                    <td className="px-4 py-4 align-middle sm:px-5 w-[300px]">
                      <div className="flex flex-row items-center gap-2">
                        {match.status === "missing" ||
                        match.status === "partial" ? (
                          <button
                            type="button"
                            className={'inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-accent px-4 py-2 text-xs font-medium text-white shadow-sm transition-all duration-150 hover:border-accent hover:text-accent hover:bg-transparent hover:shadow-md active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40'}
                            onClick={() => void handleCreate(c)}
                            disabled={creatingId === c.id || dryRun}
                            title={
                              dryRun ? "Disabled in dry-run mode" : undefined
                            }
                          >
                            {creatingId === c.id ? (
                              <>
                                <span className="inline-block h-3 w-3 shrink-0 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                Creating…
                              </>
                            ) : (
                              <>
                                <Sparkles size={12} aria-hidden /> Create type
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="font-mono text-[10px] font-medium uppercase tracking-wide text-muted">
                            Reusing
                          </span>
                        )}
                        <button
                          type="button"
                          className={btnGhost}
                          onClick={() => setExpanded(open ? null : c.id)}
                        >
                          {open ? "Hide schema" : "View schema"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={4} className="p-0">
                        <SchemaPreview component={c} match={match} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {err && (
        <p className="mt-4 text-sm text-brand-red" role="alert">
          {err}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          className={btnPrimary}
          onClick={() => setStep("page")}
          disabled={!allResolved}
        >
          Continue to page setup <ArrowRight size={14} aria-hidden />
        </button>
        {!allResolved && (
          <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-muted">
            Resolve all types to continue
          </span>
        )}
      </div>
    </>
  );
}

function MatchBadge({
  status,
}: {
  status: "matched" | "partial" | "missing";
}) {
  const cls = {
    matched:
      "border-emerald-200 bg-green-muted text-brand-green ring-1 ring-emerald-100",
    partial:
      "border-amber-200 bg-yellow-soft text-amber-900 ring-1 ring-amber-100",
    missing:
      "border-red-200 bg-red-soft text-brand-red ring-1 ring-red-100",
  }[status];
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {status}
    </span>
  );
}

function SchemaPreview({
  component,
  match,
}: {
  component: DetectedComponent;
  match: MatchResult;
}) {
  return (
    <div className="border-t border-line bg-paper-2/50 p-6 sm:p-8">
      <div className="mb-5 flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="font-sans text-lg font-semibold tracking-tight text-ink sm:text-xl">
          {component.name} — inferred schema
        </h3>
        <code className="font-mono text-[11px] text-accent">
          {match.contentTypeUid ?? component.suggestedUid}
        </code>
      </div>
      <div className="overflow-x-auto">
      {component.fields.map((f) => (
        <div
          key={f.uid}
          className="grid min-w-[520px] gap-3 border-b border-dotted border-line py-3 text-sm last:border-b-0 sm:items-center"
          style={{
            gridTemplateColumns:
              "24px minmax(0,1fr) minmax(0,120px) auto minmax(0,72px)",
          }}
        >
          <span className="text-muted" aria-hidden>
            <GripVertical size={14} />
          </span>
          <div className="min-w-0">
            <div className="font-medium text-ink">{f.displayName}</div>
            <div className="font-mono text-xs text-muted">{f.uid}</div>
          </div>
          <span className="hidden font-mono text-xs text-muted sm:block">
            {f.source ?? "auto"}
          </span>
          <span
            className={`justify-self-start rounded-md px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide ${
              f.type === "group"
                ? "bg-accent text-white"
                : f.type === "rich_text"
                  ? "bg-brand-green text-white"
                  : "bg-ink text-white"
            }`}
          >
            {TYPE_LABEL[f.type]}
          </span>
          <span
            className={`font-mono text-[10px] font-medium uppercase tracking-wide ${
              f.required ? "text-brand-red" : "text-muted"
            }`}
          >
            {f.required ? "required" : "optional"}
          </span>
        </div>
      ))}
      </div>
    </div>
  );
}
