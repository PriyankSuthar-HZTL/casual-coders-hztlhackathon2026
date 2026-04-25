import { NextResponse } from "next/server";
import axios from "axios";
import { listContentTypes } from "@/lib/contentstack";
import type {
  ContentstackTestRequest,
  ContentstackTestResponse,
} from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as ContentstackTestRequest;

  if (!body?.config?.apiKey || (!body?.config?.managementToken && !body?.config?.authToken)) {
    return NextResponse.json<ContentstackTestResponse>(
      { ok: false, error: "missing_credentials" },
      { status: 400 },
    );
  }

  try {
    const cts = await listContentTypes(body.config);
    return NextResponse.json<ContentstackTestResponse>({
      ok: true,
      contentTypeCount: cts.length,
    });
  } catch (err) {
    const message =
      axios.isAxiosError(err)
        ? (err.response?.data?.error_message as string) || err.message
        : err instanceof Error
          ? err.message
          : "test_failed";
    return NextResponse.json<ContentstackTestResponse>(
      { ok: false, error: message },
      { status: 401 },
    );
  }
}
