import { NextResponse } from "next/server";
import {
  appendJiraTraceSectionToConfluenceHtml,
  createConfluencePage,
  createJiraIssue,
  getConfluencePageStorage,
  updateConfluencePageStorage,
} from "@/lib/atlassian";
import type {
  IntegrationComponentResult,
  IntegrationSubmitRequest,
  IntegrationSubmitResponse,
} from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as IntegrationSubmitRequest;
  const config = body?.config;

  if (
    !config?.siteUrl?.trim() ||
    !config?.email?.trim() ||
    !config?.apiToken?.trim()
  ) {
    return NextResponse.json<IntegrationSubmitResponse>(
      { ok: false, error: "missing_credentials" },
      { status: 400 },
    );
  }

  if (!body.createJira && !body.createConfluence) {
    return NextResponse.json<IntegrationSubmitResponse>(
      { ok: false, error: "select_at_least_one_target" },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.items) || !body.items.length) {
    return NextResponse.json<IntegrationSubmitResponse>(
      { ok: false, error: "missing_items" },
      { status: 400 },
    );
  }

  const existingSync = body.existingSync ?? {};
  const componentResults: IntegrationComponentResult[] = [];

  for (const item of body.items) {
    const log: string[] = [];
    const row: IntegrationComponentResult = {
      componentId: item.componentId,
      componentName: item.componentName,
    };

    const prior = existingSync[item.componentId] ?? {};

    let confluencePageId: string | undefined;
    let confluencePageUrl: string | undefined;
    let jiraKey: string | undefined;
    let jiraUrl: string | undefined;

    // —— 1) Confluence first (when enabled) ——
    if (body.createConfluence) {
      if (!body.confluenceSpaceKey || !item.confluenceDraft) {
        row.confluence = { ok: false, error: "missing_confluence_payload" };
        log.push("Confluence: missing space or draft");
      } else if (prior.confluencePageId) {
        confluencePageId = prior.confluencePageId;
        confluencePageUrl = prior.confluenceUrl;
        row.confluence = {
          ok: true,
          skipped: true,
          id: confluencePageId,
          url: confluencePageUrl,
        };
        log.push(`Confluence: skipped (already have page ${confluencePageId})`);
      } else {
        try {
          const page = await createConfluencePage(
            config,
            body.confluenceSpaceKey,
            item.confluenceDraft,
          );
          confluencePageId = page.pageId;
          confluencePageUrl = page.pageUrl;
          row.confluence = {
            ok: true,
            id: confluencePageId,
            url: confluencePageUrl,
          };
          log.push(`Confluence: created page ${confluencePageId}`);
        } catch (err) {
          row.confluence = {
            ok: false,
            error: err instanceof Error ? err.message : "confluence_failed",
          };
          log.push(`Confluence: failed — ${row.confluence.error}`);
        }
      }
    }

    // —— 2) Jira (when enabled); description = Confluence URL only ——
    if (body.createJira) {
      if (!body.jiraProjectId || !item.jiraDraft) {
        row.jira = { ok: false, error: "missing_jira_payload" };
        log.push("Jira: missing project or draft");
      } else if (prior.jiraKey) {
        jiraKey = prior.jiraKey;
        jiraUrl = prior.jiraUrl;
        row.jira = {
          ok: true,
          skipped: true,
          id: jiraKey,
          url: jiraUrl,
        };
        log.push(`Jira: skipped (already have issue ${jiraKey})`);
      } else {
        // Jira ticket description contains ONLY the Confluence page link.
        // When Confluence was also created, use the real URL; otherwise fall
        // back to the draft description so the ticket isn't left blank.
        const description = confluencePageUrl
          ? `Confluence documentation: ${confluencePageUrl}`
          : item.jiraDraft.description;
        try {
          const issue = await createJiraIssue(config, body.jiraProjectId, {
            summary: item.jiraDraft.summary,
            description,
          });
          jiraKey = issue.issueKey;
          jiraUrl = issue.issueUrl;
          row.jira = {
            ok: true,
            id: jiraKey,
            url: jiraUrl,
          };
          log.push(`Jira: created ${jiraKey}`);
        } catch (err) {
          row.jira = {
            ok: false,
            error: err instanceof Error ? err.message : "jira_failed",
          };
          log.push(`Jira: failed — ${row.jira.error}`);
        }
      }
    }

    // —— 3) Bidirectional traceability on Confluence HTML ——
    if (
      body.createJira &&
      body.createConfluence &&
      confluencePageId &&
      jiraKey &&
      jiraUrl &&
      row.confluence?.ok &&
      row.jira?.ok
    ) {
      try {
        const current = await getConfluencePageStorage(config, confluencePageId);
        const nextHtml = appendJiraTraceSectionToConfluenceHtml(
          current.storageHtml,
          jiraKey,
          jiraUrl,
        );
        if (nextHtml !== current.storageHtml) {
          await updateConfluencePageStorage(
            config,
            confluencePageId,
            nextHtml,
            "MigrateX: link Jira issue",
          );
          log.push("Confluence: appended Related Jira section");
        } else {
          log.push("Confluence: Related Jira section already present");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "link_back_failed";
        log.push(`Confluence link-back: failed — ${msg}`);
        // Non-fatal for the row: ticket/page were created; user can paste link manually.
      }
    }

    row.log = log;
    componentResults.push(row);
  }

  const ok = componentResults.every((r) => {
    if (body.createJira && r.jira?.ok !== true) return false;
    if (body.createConfluence && r.confluence?.ok !== true) return false;
    return true;
  });

  return NextResponse.json<IntegrationSubmitResponse>(
    {
      ok,
      allSucceeded: ok,
      components: componentResults,
    },
    { status: ok ? 200 : 207 },
  );
}
