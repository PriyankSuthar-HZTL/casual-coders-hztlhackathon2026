// Builds the title sent to Contentstack. Appends a local timestamp with
// seconds so re-runs don't collide with Contentstack's unique-title constraint.

export function entryTitle(base: string, at: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}` +
    ` ${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`;
  const trimmed = (base || "Untitled").trim();
  return `${trimmed} — ${stamp}`;
}
