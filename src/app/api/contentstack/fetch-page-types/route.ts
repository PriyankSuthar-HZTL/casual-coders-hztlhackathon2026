import { NextResponse } from "next/server";
import { listContentTypes, describeCsError } from "@/lib/contentstack";
import type {
  FetchPageTypesRequest,
  FetchPageTypesResponse,
  PageTypeInfo,
  ContentstackField,
} from "@/types";

export const runtime = "nodejs";

type BlockField = { uid: string; schema?: ContentstackField[] };

function extractBlockUids(schema: ContentstackField[]): string[] {
  const uids: string[] = [];
  for (const field of schema) {
    const fieldAny = field as unknown as { data_type: string; blocks?: BlockField[] };
    if (fieldAny.data_type === "blocks" && Array.isArray(fieldAny.blocks)) {
      for (const block of fieldAny.blocks) {
        if (block.uid) uids.push(block.uid);
      }
    }
  }
  return uids;
}

function hasModularBlocksField(schema: ContentstackField[]): boolean {
  return schema.some((f) => f.data_type === "blocks");
}

export async function POST(request: Request) {
  const body = (await request.json()) as FetchPageTypesRequest;

  if (!body?.config?.apiKey) {
    return NextResponse.json<FetchPageTypesResponse>(
      { ok: false, pageTypes: [], error: "bad_request" },
      { status: 400 },
    );
  }

  try {
    const all = await listContentTypes(body.config);

    const pageTypes: PageTypeInfo[] = all
      .filter((ct) => {
        const isPage = ct.options?.is_page === true;
        const hasBlocks = hasModularBlocksField(ct.schema ?? []);
        return isPage || hasBlocks;
      })
      .map((ct) => ({
        uid: ct.uid,
        title: ct.title,
        isPage: ct.options?.is_page === true,
        hasModularBlocks: hasModularBlocksField(ct.schema ?? []),
        existingBlockUids: extractBlockUids(ct.schema ?? []),
      }));

    return NextResponse.json<FetchPageTypesResponse>({ ok: true, pageTypes });
  } catch (err) {
    return NextResponse.json<FetchPageTypesResponse>(
      { ok: false, pageTypes: [], error: describeCsError(err) },
      { status: 502 },
    );
  }
}
