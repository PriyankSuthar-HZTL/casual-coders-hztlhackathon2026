const JIRA_SUMMARY_SUFFIX = " - Implementation / Review Task";
const CONFLUENCE_TITLE_SUFFIX = " - Technical Documentation";

/** Jira summary max 255 chars — trim component name to fit suffix. */
export function formatJiraSummary(componentName: string): string {
  const suffix = JIRA_SUMMARY_SUFFIX;
  const maxName = 255 - suffix.length;
  const trimmed = componentName.trim();
  const name =
    trimmed.length > maxName
      ? trimmed.slice(0, Math.max(1, maxName - 1)).trimEnd() + "…"
      : trimmed;
  return `${name}${suffix}`;
}

export function formatConfluenceTitle(componentName: string): string {
  return `${componentName.trim()}${CONFLUENCE_TITLE_SUFFIX}`;
}
