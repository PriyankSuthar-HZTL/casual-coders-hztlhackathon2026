import { NextResponse } from "next/server";
import {
  buildEntryPayload,
  buildStackUrl,
  createContentType,
  createEntry,
  describeCsError,
  generateContentTypeSchema,
  getContentType,
} from "@/lib/contentstack";
import { entryTitle } from "@/lib/entry-title";
import type {
  MigrateRequest,
  MigrateResponse,
  MigrationLog,
  MigrationResult,
} from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as MigrateRequest;

  if (!body?.config?.apiKey || !Array.isArray(body?.components)) {
    return NextResponse.json<MigrateResponse>(
      {
        ok: false,
        result: emptyResult(body?.dryRun ?? false),
        error: "bad_request",
      },
      { status: 400 },
    );
  }

  const start = Date.now();
  const logs: MigrationLog[] = [];
  const log = (level: MigrationLog["level"], message: string) => {
    logs.push({ level, message, timestamp: new Date().toISOString() });
    const prefix =
      level === "error"
        ? "[migrate ✕]"
        : level === "success"
          ? "[migrate ✓]"
          : "[migrate]";
    const fn = level === "error" ? console.error : console.log;
    fn(`${prefix} ${message}`);
  };

  console.log(
    `[migrate] starting — ${body.components.length} components, dryRun=${body.dryRun}, uploadAssets=${body.uploadAssets}, pageTypeUid=${body.pageTypeUid ?? "none"}`,
  );

  let entriesCreated = 0;
  let contentTypesCreated = 0;
  let pageEntryUid: string | undefined;
  const payload: Record<string, unknown> = {};

  // Track component-instance → { ctUid, entryUid } so we can wire Modular Blocks.
  const createdEntryMap: Record<string, { ctUid: string; entryUid: string }> = {};

  try {
    // ——— Migrate component entries ———
    for (const c of body.components) {
      const match = body.matches.find((m) => m.componentId === c.id);
      if (!match) {
        log("warn", `skipping ${c.name}: no match decision`);
        continue;
      }

      let ctUid = match.contentTypeUid;

      // Ensure the CT exists (create if needed).
      if (!ctUid || match.willCreate) {
        const schema = generateContentTypeSchema(c);
        if (body.dryRun) {
          log("info", `dry-run: would create content type "${schema.uid}"`);
        } else {
          const existing = await getContentType(body.config, schema.uid);
          if (existing) {
            log("info", `content type "${schema.uid}" already exists — reusing`);
          } else {
            await createContentType(body.config, schema);
            contentTypesCreated += 1;
            log("success", `created content type "${schema.uid}"`);
          }
        }
        ctUid = schema.uid;
      }

      // Build the entry payload (uploading assets as needed).
      const entry = await buildEntryPayload(body.config, c, {
        uploadAssets: body.uploadAssets && !body.dryRun,
      });

      payload[ctUid ?? c.suggestedUid] = entry;

      if (body.dryRun) {
        log("info", `dry-run: would create entry in "${ctUid}" titled "${entry.title}"`);
        // Record a placeholder for the page-entry builder.
        createdEntryMap[c.id] = { ctUid: ctUid!, entryUid: "dry-run-placeholder" };
      } else {
        const created = await createEntry(body.config, ctUid!, entry);
        entriesCreated += 1;
        log("success", `created entry ${created.uid} in "${ctUid}"`);
        createdEntryMap[c.id] = { ctUid: ctUid!, entryUid: created.uid };
      }
    }

    // ——— Create page entry ———
    if (body.pageTypeUid) {
      const pageComponentIds = body.pageComponentIds ?? [];

      // Build the modular_blocks array — one block object per selected component.
      // Shape: [ { "<ctUid>_block": { "<ctUid>_ref": { _content_type_uid, uid } } } ]
      const modularBlocks = pageComponentIds
        .map((cid) => {
          const info = createdEntryMap[cid];
          if (!info) {
            log("warn", `page block skipped — no entry found for component "${cid}"`);
            return null;
          }
          const blockKey = `${info.ctUid}_block`;
          const refKey   = `${info.ctUid}_ref`;
          return {
            [blockKey]: {
              // Contentstack reference fields are always serialised as an array,
              // even when ref_multiple is false — the API calls .map() on the value.
              [refKey]: [
                {
                  _content_type_uid: info.ctUid,
                  uid:               info.entryUid,
                },
              ],
            },
          };
        })
        .filter(Boolean);

      const pageTitle = body.pageEntryTitle?.trim() || "Page";
      const pageUrl   = body.pageEntryUrl?.trim()   || "/";

      const pageEntryPayload: Record<string, unknown> = {
        title:          entryTitle(pageTitle),
        url:            pageUrl,
        modular_blocks: modularBlocks,
      };

      payload[`${body.pageTypeUid}__page`] = pageEntryPayload;

      if (body.dryRun) {
        log(
          "info",
          `dry-run: would create page entry "${pageEntryPayload.title}" in "${body.pageTypeUid}" with ${modularBlocks.length} block(s)`,
        );
      } else {
        try {
          const createdPage = await createEntry(
            body.config,
            body.pageTypeUid,
            pageEntryPayload,
          );
          pageEntryUid = createdPage.uid;
          entriesCreated += 1;
          log(
            "success",
            `created page entry ${createdPage.uid} in "${body.pageTypeUid}" (${modularBlocks.length} block(s))`,
          );
        } catch (pageErr) {
          // Page entry failure is non-fatal — component entries are already in.
          const msg = describeCsError(pageErr);
          log("warn", `page entry creation failed (component entries were still saved): ${msg}`);
        }
      }
    }

    const result: MigrationResult = {
      success: true,
      dryRun: body.dryRun,
      entriesCreated,
      contentTypesCreated,
      elapsedMs: Date.now() - start,
      logs,
      payload:      body.dryRun ? payload : undefined,
      stackUrl:     body.dryRun ? undefined : buildStackUrl(body.config),
      pageEntryUid: body.dryRun ? undefined : pageEntryUid,
    };

    return NextResponse.json<MigrateResponse>({ ok: true, result });
  } catch (err) {
    const message = describeCsError(err);
    log("error", message);
    console.error("[migrate ✕] full error:", err);

    return NextResponse.json<MigrateResponse>(
      {
        ok: false,
        error: message,
        result: {
          success: false,
          dryRun: body.dryRun,
          entriesCreated,
          contentTypesCreated,
          elapsedMs: Date.now() - start,
          logs,
        },
      },
      { status: 502 },
    );
  }
}

function emptyResult(dryRun: boolean): MigrationResult {
  return {
    success: false,
    dryRun,
    entriesCreated: 0,
    contentTypesCreated: 0,
    elapsedMs: 0,
    logs: [],
  };
}
