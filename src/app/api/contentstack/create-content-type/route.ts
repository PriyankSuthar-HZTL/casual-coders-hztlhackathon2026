import { NextResponse } from "next/server";
import axios from "axios";
import {
  createContentType,
  generateContentTypeSchema,
  getContentType,
} from "@/lib/contentstack";
import type {
  CreateContentTypeRequest,
  CreateContentTypeResponse,
} from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as CreateContentTypeRequest;

  if (!body?.config?.apiKey || !body?.component) {
    return NextResponse.json<CreateContentTypeResponse>(
      { ok: false, error: "bad_request" },
      { status: 400 },
    );
  }

  const schema = generateContentTypeSchema(body.component);

  try {
    // Idempotent — if a CT with this UID already exists, return it instead of failing.
    const existing = await getContentType(body.config, schema.uid);
    if (existing) {
      return NextResponse.json<CreateContentTypeResponse>({
        ok: true,
        contentType: existing,
      });
    }

    const created = await createContentType(body.config, schema);
    return NextResponse.json<CreateContentTypeResponse>({
      ok: true,
      contentType: created,
    });
  } catch (err) {
    const message =
      axios.isAxiosError(err)
        ? (err.response?.data?.error_message as string) || err.message
        : err instanceof Error
          ? err.message
          : "create_failed";
    return NextResponse.json<CreateContentTypeResponse>(
      { ok: false, error: message },
      { status: 502 },
    );
  }
}
