"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, FilePlus, LayoutTemplate, Check, RefreshCw, Link } from "lucide-react";
import { useStackshift } from "@/store";
import type {
  CreatePageTypeResponse,
  FetchPageTypesResponse,
  PageTypeInfo,
} from "@/types";

import {
  btnGhost,
  btnPrimary,
  btnSecondary,
  cardStatic,
  input,
  labelMono,
  stepEyebrow,
  stepLead,
  stepTitle,
} from "@/lib/ui";

const inputCls = input;
const monoInputCls = `${input} font-mono text-xs`;
const labelCls = labelMono;

interface NewPageFormState {
  title: string;
  uid: string;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/** Extract the path portion from a full URL string, keeping the leading slash. */
function extractPath(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    return u.pathname || "/";
  } catch {
    // rawUrl might just be a path already
    if (rawUrl.startsWith("/")) return rawUrl;
    return "/" + rawUrl;
  }
}

/** Turn a URL path into a human-readable title (best-effort). */
function titleFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (!parts.length) return "Home";
  const last = parts[parts.length - 1];
  return last
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function PageStep() {
  const config                = useStackshift((s) => s.config);
  const scannedUrl            = useStackshift((s) => s.url);
  const components            = useStackshift((s) => s.components);
  const selectedIds           = useStackshift((s) => s.selectedIds);
  const matches               = useStackshift((s) => s.matches);
  const dryRun                = useStackshift((s) => s.dryRun);
  const availablePageTypes    = useStackshift((s) => s.availablePageTypes);
  const selectedPageTypeUid   = useStackshift((s) => s.selectedPageTypeUid);
  const selectedPageTypeTitle = useStackshift((s) => s.selectedPageTypeTitle);
  const pageComponentIds      = useStackshift((s) => s.pageComponentIds);
  const pageEntryUrl          = useStackshift((s) => s.pageEntryUrl);
  const pageEntryTitle        = useStackshift((s) => s.pageEntryTitle);
  const setAvailablePageTypes = useStackshift((s) => s.setAvailablePageTypes);
  const setSelectedPageType   = useStackshift((s) => s.setSelectedPageType);
  const setPageComponentIds   = useStackshift((s) => s.setPageComponentIds);
  const togglePageComponentId = useStackshift((s) => s.togglePageComponentId);
  const setPageEntryUrl       = useStackshift((s) => s.setPageEntryUrl);
  const setPageEntryTitle     = useStackshift((s) => s.setPageEntryTitle);
  const setStep               = useStackshift((s) => s.setStep);

  const [loading, setLoading]   = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr]           = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPageForm, setNewPageForm]       = useState<NewPageFormState>({
    title: "Page",
    uid:   "page",
  });

  const didInit = useRef(false);

  const selectedComponents = components.filter((c) => selectedIds.includes(c.id));

  const componentCtMap = Object.fromEntries(
    selectedComponents.map((c) => {
      const match = matches.find((m) => m.componentId === c.id);
      return [c.id, { ctUid: match?.contentTypeUid ?? c.suggestedUid, title: c.name }];
    }),
  );

  // On first render, pre-fill URL and title from the scanned page URL.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (scannedUrl) {
      const path  = extractPath(scannedUrl);
      const title = titleFromPath(path);
      // Only overwrite the defaults — don't clobber user edits on back-nav.
      if (pageEntryUrl === "/" || pageEntryUrl === "") setPageEntryUrl(path);
      if (pageEntryTitle === "Home" || pageEntryTitle === "") setPageEntryTitle(title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch existing page types on mount (skip if already loaded).
  useEffect(() => {
    if (availablePageTypes.length > 0) return;
    void fetchPageTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPageTypes = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res  = await fetch("/api/contentstack/fetch-page-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = (await res.json()) as FetchPageTypesResponse;
      if (!data.ok) { setErr(data.error ?? "Failed to fetch page types."); return; }
      setAvailablePageTypes(data.pageTypes);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPageType = (pt: PageTypeInfo) => {
    setSelectedPageType(pt.uid, pt.title);
    setShowCreateForm(false);
    if (pageComponentIds.length === 0) {
      setPageComponentIds(selectedComponents.map((c) => c.id));
    }
  };

  const handleCreateNewPageType = async () => {
    setErr(null);
    setCreating(true);

    const selectedCts     = pageComponentIds.map((id) => componentCtMap[id]).filter(Boolean);
    const componentUids   = selectedCts.map((x) => x.ctUid);
    const componentTitles = selectedCts.map((x) => x.title);

    try {
      if (!dryRun) {
        const res  = await fetch("/api/contentstack/create-page-type", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config,
            pageTitle:        newPageForm.title,
            pageUid:          newPageForm.uid,
            componentUids,
            componentTitles,
          }),
        });
        const data = (await res.json()) as CreatePageTypeResponse;
        if (!data.ok || !data.contentType) {
          setErr(data.error ?? "Failed to create page type."); return;
        }
        const newPt: PageTypeInfo = {
          uid:               data.contentType.uid,
          title:             data.contentType.title,
          isPage:            data.contentType.options?.is_page ?? true,
          hasModularBlocks:  true,
          existingBlockUids: componentUids.map((u) => `${u}_block`),
        };
        setAvailablePageTypes([...availablePageTypes, newPt]);
        setSelectedPageType(newPt.uid, newPt.title);
      } else {
        const newPt: PageTypeInfo = {
          uid:               newPageForm.uid,
          title:             newPageForm.title,
          isPage:            true,
          hasModularBlocks:  true,
          existingBlockUids: componentUids.map((u) => `${u}_block`),
        };
        setAvailablePageTypes([...availablePageTypes, newPt]);
        setSelectedPageType(newPt.uid, newPt.title);
      }
      setShowCreateForm(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error.");
    } finally {
      setCreating(false);
    }
  };

  const canContinue =
    Boolean(selectedPageTypeUid) &&
    pageComponentIds.length > 0 &&
    Boolean(pageEntryUrl.trim());

  const handleNewTitleChange = (title: string) => {
    setNewPageForm({ title, uid: slugify(title) || "page" });
  };

  const showUrlSection = Boolean(selectedPageTypeUid) || showCreateForm;

  return (
    <>
      <header className="mb-6 sm:mb-8">
        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <span className={stepEyebrow}>Page</span>
        </div>
        <h2 className={stepTitle}>
          Associate with a <span className="text-accent">page type</span>.
        </h2>
        <p className={`${stepLead} mt-3 max-w-[42rem]`}>
          Select the Page content type that will host these components via Modular Blocks. Set the page URL and title — then a page entry will be created automatically alongside your component entries.
        </p>
      </header>

      {dryRun && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-yellow-soft px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-wide text-brand-yellow" role="status">
          Dry-run mode — page type &amp; entry creation will be simulated. Nothing written to Contentstack.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">

        <section className={`${cardStatic} overflow-hidden shadow-card-md`}>
          <div className="flex items-center justify-between border-b border-line bg-paper-2 px-4 py-3 sm:px-5">
            <h3 className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted">
              Page content types
            </h3>
            <button
              type="button"
              className={btnGhost}
              onClick={() => { void fetchPageTypes(); }}
              disabled={loading}
              title="Refresh list"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <div className="p-5">
            {loading && (
              <div className="flex items-center gap-2.5 py-8 justify-center text-muted font-mono text-[11px] tracking-[1px]">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-line border-t-accent animate-spin" />
                Scanning content types…
              </div>
            )}

            {!loading && availablePageTypes.length === 0 && !showCreateForm && (
              <div className="py-8 text-center">
                <LayoutTemplate size={28} className="mx-auto text-muted mb-3 opacity-50" />
                <p className="font-sans text-sm text-muted mb-4 leading-[1.5]">
                  No page content types found.<br />Create a base page to get started.
                </p>
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => {
                    setShowCreateForm(true);
                    setPageComponentIds(selectedComponents.map((c) => c.id));
                  }}
                >
                  <FilePlus size={12} /> Create base page type
                </button>
              </div>
            )}

            {!loading && availablePageTypes.length > 0 && (
              <ul className="space-y-2 mb-4">
                {availablePageTypes.map((pt) => {
                  const isSelected = pt.uid === selectedPageTypeUid;
                  return (
                    <li key={pt.uid}>
                      <button
                        type="button"
                        onClick={() => handleSelectPageType(pt)}
                        className={[
                          "w-full cursor-pointer rounded-lg border px-4 py-3.5 text-left transition-colors duration-150",
                          isSelected
                            ? "border-accent bg-accent-muted text-ink ring-1 ring-accent/15"
                            : "border-line bg-card hover:border-line-strong hover:bg-paper-2",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{pt.title}</span>
                          {isSelected && <Check size={14} className="shrink-0 text-accent" strokeWidth={2.5} aria-hidden />}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="font-mono text-[9.5px] tracking-[1.2px] uppercase opacity-60">{pt.uid}</span>
                          {pt.isPage && (
                            <span className="font-mono text-[9px] px-1.5 py-[2px] bg-brand-green/20 text-brand-green border border-brand-green/30 rounded-[2px] uppercase tracking-[1px]">
                              is_page
                            </span>
                          )}
                          {pt.hasModularBlocks && (
                            <span className="font-mono text-[9px] px-1.5 py-[2px] bg-accent/15 text-accent border border-accent/30 rounded-[2px] uppercase tracking-[1px]">
                              modular blocks
                            </span>
                          )}
                        </div>
                        {pt.existingBlockUids.length > 0 && (
                          <p className="font-mono text-[9.5px] text-muted mt-1.5 opacity-70 tracking-[0.5px]">
                            {pt.existingBlockUids.length} block type{pt.existingBlockUids.length !== 1 ? "s" : ""} defined
                          </p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {!loading && !showCreateForm && (
              <button
                className={btnGhost}
                onClick={() => {
                  setShowCreateForm(true);
                  if (pageComponentIds.length === 0) {
                    setPageComponentIds(selectedComponents.map((c) => c.id));
                  }
                }}
              >
                <FilePlus size={12} />
                {availablePageTypes.length > 0 ? "Create another page type" : "Create base page type"}
              </button>
            )}

            {showCreateForm && (
              <div className="mt-2 rounded-lg border border-dashed border-accent/35 bg-accent-muted/40 p-4">
                <p className="mb-3.5 font-mono text-[10px] font-medium uppercase tracking-wider text-accent">
                  New page content type
                </p>

                <label className={labelCls}>Display name</label>
                <input
                  className={`${inputCls} mb-3`}
                  value={newPageForm.title}
                  onChange={(e) => handleNewTitleChange(e.target.value)}
                  placeholder="Page"
                />

                <label className={labelCls}>UID</label>
                <input
                  className={`${monoInputCls} mb-4`}
                  value={newPageForm.uid}
                  onChange={(e) => setNewPageForm((f) => ({ ...f, uid: slugify(e.target.value) }))}
                  placeholder="page"
                />

                <p className="font-mono text-[10px] text-muted mb-3.5 leading-[1.6]">
                  Includes: Title · URL · SEO Title · SEO Description · Modular Blocks
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => { void handleCreateNewPageType(); }}
                    disabled={creating || !newPageForm.uid}
                  >
                    {creating
                      ? <><span className="w-3 h-3 rounded-full border-2 border-paper-2 border-t-accent animate-spin" /> Creating…</>
                      : <><FilePlus size={11} /> {dryRun ? "Simulate" : "Create"}</>}
                  </button>
                  <button className={btnGhost} onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right: Component selection for Modular Blocks */}
        <section className={`${cardStatic} overflow-hidden shadow-card-md`}>
          <div className="border-b border-line bg-paper-2 px-4 py-3 sm:px-5">
            <h3 className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted">
              Components for Modular Blocks
            </h3>
          </div>

          <div className="p-5 sm:p-6">
            {!selectedPageTypeUid && !showCreateForm ? (
              <div className="py-8 text-center">
                <p className="font-sans text-sm text-muted leading-[1.5]">
                  Select or create a page type on the left to map components.
                </p>
              </div>
            ) : (
              <>
                <p className="font-sans text-[13px] text-muted mb-4 leading-[1.5]">
                  Choose which detected components should be wired as block types in the Modular Blocks field.
                  {selectedPageTypeTitle && (
                    <> They will appear in <strong className="text-ink">{selectedPageTypeTitle}</strong> as selectable blocks.</>
                  )}
                </p>

                {selectedComponents.length === 0 ? (
                  <p className="font-sans text-sm text-muted">No components were selected in an earlier step.</p>
                ) : (
                  <>
                    <div className="flex gap-2 mb-4">
                      <button className={btnGhost} onClick={() => setPageComponentIds(selectedComponents.map((c) => c.id))}>
                        Select all
                      </button>
                      <button className={btnGhost} onClick={() => setPageComponentIds([])}>
                        Clear
                      </button>
                    </div>

                    <ul className="space-y-2">
                      {selectedComponents.map((c) => {
                        const ct        = componentCtMap[c.id];
                        const isChecked = pageComponentIds.includes(c.id);
                        return (
                          <li key={c.id}>
                            <label
                              className={[
                                "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors duration-150",
                                isChecked ? "border-accent/30 bg-accent-muted/50" : "border-line bg-card hover:border-line-strong hover:bg-paper-2",
                              ].join(" ")}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePageComponentId(c.id)}
                                className="mt-0.5 h-4 w-4 shrink-0 accent-accent focus:ring-2 focus:ring-accent/25"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{c.name}</div>
                                <div className="font-mono text-[9.5px] text-muted uppercase tracking-[1px] mt-0.5">
                                  Block: <span className="text-ink">{ct?.ctUid ?? c.suggestedUid}_block</span>
                                </div>
                                <div className="font-mono text-[9.5px] text-muted mt-0.5 tracking-[0.5px]">
                                  Ref → <span className="text-ink">{ct?.ctUid ?? c.suggestedUid}</span>
                                </div>
                              </div>
                              {isChecked && <Check size={14} className="mt-0.5 shrink-0 text-accent" strokeWidth={2.5} aria-hidden />}
                            </label>
                          </li>
                        );
                      })}
                    </ul>

                    <p className="font-mono text-[10px] text-muted mt-4 tracking-[0.5px]">
                      {pageComponentIds.length} of {selectedComponents.length} component{selectedComponents.length !== 1 ? "s" : ""} selected
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {/* ——— Page entry URL & title ——— */}
      {showUrlSection && (
        <section className={`${cardStatic} mt-6 overflow-hidden shadow-card-md lg:col-span-2`}>
          <div className="flex flex-col gap-2 border-b border-line bg-paper-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-2.5 sm:px-5">
            <div className="flex items-center gap-2">
              <Link size={14} className="shrink-0 text-accent" aria-hidden />
              <h3 className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted">
                Page entry details
              </h3>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wide text-muted opacity-70 sm:ml-auto sm:text-right">
              Page entry is created automatically during migration
            </span>
          </div>

          <div className="grid gap-5 p-6 sm:grid-cols-2">
            {/* URL slug */}
            <div>
              <label className={labelCls}>URL / Slug</label>
              <div className="relative">
                <input
                  className={monoInputCls}
                  value={pageEntryUrl}
                  onChange={(e) => {
                    // Ensure the slug always starts with /
                    const raw = e.target.value;
                    setPageEntryUrl(raw.startsWith("/") ? raw : `/${raw}`);
                  }}
                  placeholder="/my-page"
                  spellCheck={false}
                />
              </div>
              <p className="font-mono text-[10px] text-muted mt-1.5 tracking-[0.5px]">
                Pre-filled from scanned URL · edit freely
              </p>
              {scannedUrl && (
                <button
                  className="mt-1 cursor-pointer border-none bg-transparent p-0 font-mono text-[10px] text-accent underline underline-offset-2"
                  onClick={() => setPageEntryUrl(extractPath(scannedUrl))}
                  type="button"
                >
                  Reset to scanned path ({extractPath(scannedUrl)})
                </button>
              )}
            </div>

            {/* Page entry title */}
            <div>
              <label className={labelCls}>Page entry title</label>
              <input
                className={inputCls}
                value={pageEntryTitle}
                onChange={(e) => setPageEntryTitle(e.target.value)}
                placeholder="Home"
              />
              <p className="font-mono text-[10px] text-muted mt-1.5 tracking-[0.5px]">
                Display name inside Contentstack CMS
              </p>
            </div>
          </div>
        </section>
      )}

      {err && <p className="mt-5 text-accent text-sm font-sans">{err}</p>}

      {/* ——— Summary bar ——— */}
      {selectedPageTypeUid && pageComponentIds.length > 0 && pageEntryUrl && (
        <div className="mt-6 rounded-xl border border-line bg-paper-2 px-4 py-4 font-mono text-[11px] text-muted sm:px-5 lg:col-span-2">
          <span className="text-ink font-semibold">{selectedPageTypeTitle}</span>
          {" "}·{" "}
          <span className="text-accent">{pageEntryUrl}</span>
          {" "}will include Modular Blocks for:{" "}
          {pageComponentIds.map((id, i) => {
            const ct = componentCtMap[id];
            return (
              <span key={id}>
                {i > 0 && ", "}
                <span className="text-ink">{ct?.title ?? id}</span>
              </span>
            );
          })}
        </div>
      )}

      <div className="mt-7 flex gap-3 items-center flex-wrap">
        <button
          className={btnPrimary}
          onClick={() => setStep("preview")}
          disabled={!canContinue}
        >
          Continue to preview <ArrowRight size={12} />
        </button>
        {!canContinue && (
          <span className="font-mono text-[11px] tracking-[1.5px] uppercase text-muted">
            {!selectedPageTypeUid
              ? "Select or create a page type to continue"
              : pageComponentIds.length === 0
                ? "Select at least one component to continue"
                : "Enter a URL to continue"}
          </span>
        )}
        <button
          className={btnGhost}
          onClick={() => {
            setSelectedPageType(null, null);
            setStep("preview");
          }}
        >
          Skip — migrate components only
        </button>
      </div>
    </>
  );
}
