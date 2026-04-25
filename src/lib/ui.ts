/**
 * Shared Tailwind class strings — buttons, inputs, labels, surfaces.
 * Import from `@/lib/ui` so wizard steps and panels stay visually aligned.
 */

export const label =
  "block text-[11px] font-medium font-sans uppercase tracking-wider text-muted mb-2";

export const labelMono =
  "block font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted mb-2";

export const input =
  "w-full rounded-lg border border-line bg-card px-3.5 py-3 text-sm text-ink shadow-sm transition-colors duration-150 placeholder:text-muted-soft hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none";

export const inputLg =
  "w-full rounded-lg border border-line bg-card px-5 py-[14px] font-mono text-base text-ink shadow-sm transition-colors duration-150 placeholder:text-muted-soft hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none";

export const inputMono =
  `${input} font-mono text-xs`;

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-accent-2 hover:shadow-md active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40";

export const btnPrimaryLg =
  "inline-flex items-center justify-center gap-2.5 rounded-lg bg-accent px-7 py-3.5 text-[15px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-accent-2 hover:shadow-md active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-ink px-4 py-2 text-xs font-medium text-white shadow-sm transition-all duration-150 hover:bg-ink-soft hover:shadow-md active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-transparent px-3.5 py-2 text-xs font-medium text-ink transition-all duration-150 hover:bg-paper-2 hover:border-line-strong active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40";

export const btnGhostSm =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-transparent px-3.5 py-2 text-xs font-medium text-ink transition-all duration-150 hover:bg-paper-2 hover:border-line-strong disabled:pointer-events-none disabled:opacity-40";

/** Toolbar on dark backgrounds (e.g. detect step) */
export const btnOnDark =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white backdrop-blur-sm transition-all duration-150 hover:bg-white/10 hover:border-white/20 disabled:pointer-events-none disabled:opacity-40";

export const btnOnDarkPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-xs font-medium text-white shadow-md transition-all duration-150 hover:bg-accent-2 disabled:pointer-events-none disabled:opacity-40";

export const card =
  "overflow-hidden rounded-xl border border-line bg-card shadow-card-md transition-shadow duration-200 hover:shadow-card-lg";

export const cardStatic =
  "overflow-hidden rounded-xl border border-line bg-card shadow-card-md";

export const iconButton =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-ink transition-colors duration-150 hover:bg-paper-2 hover:border-line focus-visible:ring-2 focus-visible:ring-accent/25";

export const stepEyebrow =
  "font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent";

export const stepTitle =
  "font-sans text-3xl font-semibold tracking-tight text-ink sm:text-[2.25rem] sm:leading-[1.1]";

export const stepLead =
  "text-base leading-relaxed text-muted sm:text-[15px]";

export const alertError =
  "inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-soft px-3 py-2 text-sm text-brand-red";

export const alertSuccess =
  "inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-green-muted px-3 py-2 text-sm text-brand-green";

export const alertWarning =
  "inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-yellow-soft px-3 py-2 text-sm text-brand-yellow";
