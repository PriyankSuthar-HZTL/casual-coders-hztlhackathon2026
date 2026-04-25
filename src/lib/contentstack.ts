// ——————————————————————————————————————
//  MigrateX — Contentstack Management API client
//  Thin wrapper around axios; avoids the SDK weight.
// ——————————————————————————————————————

import axios, { type AxiosInstance } from "axios";
import FormData from "form-data";
import { entryTitle } from "@/lib/entry-title";
import type {
  ContentstackConfig,
  ContentstackContentType,
  ContentstackField,
  DetectedComponent,
  DetectedField,
  FieldType,
  MatchResult,
  MatchStatus,
  Region,
} from "@/types";

// ——— Region → API host mapping ———
export const REGION_HOSTS: Record<Region, string> = {
  na: "https://api.contentstack.io",
  eu: "https://eu-api.contentstack.com",
  au: "https://au-api.contentstack.com",
  "azure-na": "https://azure-na-api.contentstack.com",
  "azure-eu": "https://azure-eu-api.contentstack.com",
  "gcp-na": "https://gcp-na-api.contentstack.com",
};

export function client(config: ContentstackConfig): AxiosInstance {
  const headers: Record<string, string> = {
    api_key: config.apiKey,
    "Content-Type": "application/json",
  };
  if (config.authToken) {
    headers.authtoken = config.authToken;
  } else if (config.managementToken) {
    headers.authorization = config.managementToken;
  }
  const instance = axios.create({
    baseURL: REGION_HOSTS[config.region] ?? REGION_HOSTS.na,
    headers,
    timeout: 30_000,
  });

  instance.interceptors.request.use((req) => {
    const method = (req.method ?? "GET").toUpperCase();
    const url = `${req.baseURL ?? ""}${req.url ?? ""}`;
    console.log(`[CS →] ${method} ${url}`);
    if (req.data) {
      const preview = JSON.stringify(req.data);
      console.log(
        `[CS →] body: ${preview.length > 800 ? `${preview.slice(0, 800)}… (${preview.length} chars)` : preview}`,
      );
    }
    return req;
  });

  instance.interceptors.response.use(
    (res) => {
      const method = (res.config.method ?? "GET").toUpperCase();
      console.log(`[CS ←] ${res.status} ${method} ${res.config.url ?? ""}`);
      return res;
    },
    (err) => {
      if (axios.isAxiosError(err)) {
        const method = (err.config?.method ?? "GET").toUpperCase();
        const status = err.response?.status ?? "no-response";
        console.error(
          `[CS ✕] ${status} ${method} ${err.config?.url ?? ""} — ${err.message}`,
        );
        if (err.response?.data) {
          console.error(
            `[CS ✕] body: ${JSON.stringify(err.response.data, null, 2)}`,
          );
        }
      } else {
        console.error("[CS ✕]", err);
      }
      return Promise.reject(err);
    },
  );

  return instance;
}

// Extract the most useful error text from a Contentstack axios error.
// Contentstack returns { error_message, error_code, errors: { field: [msgs] } }.
export function describeCsError(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : "unknown_error";
  }
  const data = err.response?.data as
    | {
        error_message?: string;
        error_code?: number;
        errors?: Record<string, string[] | string>;
      }
    | undefined;
  const base = data?.error_message ?? err.message;
  if (data?.errors) {
    const parts = Object.entries(data.errors)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("; ");
    return parts ? `${base} — ${parts}` : base;
  }
  return base;
}

// ——— CT operations ———

export async function listContentTypes(
  config: ContentstackConfig,
): Promise<ContentstackContentType[]> {
  const res = await client(config).get("/v3/content_types", {
    params: { include_count: true, limit: 100 },
  });
  return (res.data?.content_types ?? []) as ContentstackContentType[];
}

export async function getContentType(
  config: ContentstackConfig,
  uid: string,
): Promise<ContentstackContentType | null> {
  try {
    const res = await client(config).get(`/v3/content_types/${uid}`);
    return (res.data?.content_type ?? null) as ContentstackContentType | null;
  } catch (err) {
    // 404/422 → missing. Rethrow other errors so callers can see real problems.
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    if (status === 404 || status === 422) return null;
    throw err;
  }
}

export async function createContentType(
  config: ContentstackConfig,
  ct: ContentstackContentType,
): Promise<ContentstackContentType> {
  const res = await client(config).post("/v3/content_types", {
    content_type: ct,
  });
  return res.data.content_type as ContentstackContentType;
}

export async function createEntry(
  config: ContentstackConfig,
  contentTypeUid: string,
  entry: Record<string, unknown>,
): Promise<{ uid: string }> {
  const res = await client(config).post(
    `/v3/content_types/${contentTypeUid}/entries`,
    { entry },
  );
  return { uid: res.data.entry.uid };
}

// ——— Asset upload ———

export async function uploadAssetFromUrl(
  config: ContentstackConfig,
  url: string,
): Promise<{ uid: string; url: string } | null> {
  try {
    // Download the asset.
    const dl = await axios.get<ArrayBuffer>(url, {
      responseType: "arraybuffer",
      timeout: 15_000,
    });
    const buf = Buffer.from(dl.data);
    const filename = url.split("/").pop()?.split("?")[0] || "asset";

    const rawType = dl.headers["content-type"];
    const contentType =
      typeof rawType === "string" && rawType.length > 0
        ? rawType
        : "application/octet-stream";

    const form = new FormData();
    form.append("asset[upload]", buf, { filename, contentType });

    const res = await axios.post(
      `${REGION_HOSTS[config.region] ?? REGION_HOSTS.na}/v3/assets`,
      form,
      {
        headers: {
          api_key: config.apiKey,
          ...(config.authToken
            ? { authtoken: config.authToken }
            : { authorization: config.managementToken }),
          ...form.getHeaders(),
        },
        timeout: 30_000,
      },
    );
    const asset = res.data.asset;
    console.log(`[CS ←] asset uploaded ${asset.uid} ← ${url}`);
    return { uid: asset.uid, url: asset.url };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error(
        `[CS ✕] asset upload failed for ${url}: ${err.response?.status ?? "no-response"} ${err.message}`,
      );
      if (err.response?.data) {
        console.error(
          `[CS ✕] asset body: ${JSON.stringify(err.response.data, null, 2)}`,
        );
      }
    } else {
      console.error(`[CS ✕] asset upload failed for ${url}:`, err);
    }
    return null;
  }
}

// ——— Schema generation ———

const TYPE_MAP: Record<FieldType, string> = {
  single_line: "text",
  multi_line: "text",
  rich_text: "text",
  url: "link",
  file: "file",
  boolean: "boolean",
  number: "number",
  group: "group",
  reference: "reference",
};

export function fieldToSchema(f: DetectedField): ContentstackField {
  const base: ContentstackField = {
    display_name: f.displayName,
    uid: f.uid,
    data_type: TYPE_MAP[f.type] ?? "text",
    mandatory: f.required ?? false,
  };
  if (f.type === "multi_line") {
    base.field_metadata = { multiline: true };
  }
  if (f.type === "rich_text") {
    base.field_metadata = { allow_rich_text: true, multiline: true, rich_text_type: "advanced" };
  }
  if (f.type === "group") {
    base.multiple = true;
    base.schema = (f.itemSchema ?? []).map(fieldToSchema);
  }
  return base;
}

export function generateContentTypeSchema(
  component: DetectedComponent,
): ContentstackContentType {
  const fields = component.fields.map(fieldToSchema);

  // Ensure a mandatory title field exists and is marked _default.
  const hasTitle = fields.some((f) => f.uid === "title");
  if (!hasTitle) {
    fields.unshift({
      display_name: "Title",
      uid: "title",
      data_type: "text",
      mandatory: true,
      unique: false,
      _default: true,
    });
  } else {
    fields.forEach((f) => {
      if (f.uid === "title") f._default = true;
    });
  }

  return {
    title: component.name,
    uid: component.suggestedUid,
    description: `Auto-generated by MigrateX (${component.kind})`,
    schema: fields,
    options: {
      title: "title",
      sub_title: [],
      is_page: false,
      singleton: false,
    },
  };
}

// ——— Entry payload builder ———

export async function buildEntryPayload(
  config: ContentstackConfig,
  component: DetectedComponent,
  opts: { uploadAssets: boolean },
): Promise<Record<string, unknown>> {
  const base = component.name || firstStringField(component.fields) || "Untitled";
  const entry: Record<string, unknown> = {
    title: entryTitle(base),
  };

  for (const f of component.fields) {
    if (f.uid === "title") continue;
    entry[f.uid] = await serializeField(config, f, opts.uploadAssets);
  }

  return entry;
}

async function serializeField(
  config: ContentstackConfig,
  f: DetectedField,
  uploadAssets: boolean,
): Promise<unknown> {
  switch (f.type) {
    case "file": {
      const src = f.assetUrl ?? (typeof f.value === "string" ? f.value : "");
      if (!uploadAssets || !src) return "";
      const asset = await uploadAssetFromUrl(config, src);
      return asset?.uid ?? "";
    }
    case "group": {
      const items = (f.value as unknown[]) ?? [];
      const schema = f.itemSchema ?? [];
      if (!schema.length || !items.length) return items;
      return Promise.all(
        items.map(async (item) => {
          if (!item || typeof item !== "object") return item;
          const src = item as Record<string, unknown>;
          const out: Record<string, unknown> = {};
          for (const s of schema) {
            const raw = src[s.uid];
            const synthetic: DetectedField = {
              uid: s.uid,
              displayName: s.displayName,
              type: s.type,
              value: raw,
              assetUrl:
                s.type === "file" && typeof raw === "string" ? raw : undefined,
              itemSchema: s.itemSchema,
            };
            out[s.uid] = await serializeField(config, synthetic, uploadAssets);
          }
          return out;
        }),
      );
    }
    case "url": {
      const v = f.value;
      if (typeof v === "string") return { title: v, href: v };
      const vo = v as { title?: string; href?: string } | undefined;
      return { title: vo?.title ?? "", href: vo?.href ?? "" };
    }
    default:
      return f.value ?? "";
  }
}

function firstStringField(fields: DetectedField[]): string {
  for (const f of fields) {
    if ((f.type === "single_line" || f.type === "multi_line") && f.value) {
      return String(f.value);
    }
  }
  return "";
}

// ——— Matching ———

const tokenize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

function similarity(a: string, b: string): number {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  if (!A.size || !B.size) return 0;
  const inter = [...A].filter((t) => B.has(t)).length;
  const union = new Set([...A, ...B]).size;
  return union ? inter / union : 0;
}

export function matchComponent(
  component: DetectedComponent,
  existing: ContentstackContentType[],
): MatchResult {
  // 1. Exact UID match
  const exact = existing.find((ct) => ct.uid === component.suggestedUid);
  if (exact) {
    return {
      componentId: component.id,
      status: "matched",
      contentTypeUid: exact.uid,
      contentTypeTitle: exact.title,
      similarity: 1,
    };
  }

  // 2. Fuzzy title match
  let best: { ct: ContentstackContentType; score: number } | null = null;
  for (const ct of existing) {
    const score = Math.max(
      similarity(component.name, ct.title),
      similarity(component.suggestedUid, ct.uid),
    );
    if (!best || score > best.score) best = { ct, score };
  }

  const score = best?.score ?? 0;
  let status: MatchStatus;
  if (score >= 0.75) status = "matched";
  else if (score >= 0.4) status = "partial";
  else status = "missing";

  return {
    componentId: component.id,
    status,
    contentTypeUid: status !== "missing" ? best?.ct.uid : undefined,
    contentTypeTitle: status !== "missing" ? best?.ct.title : undefined,
    similarity: score,
    willCreate: status === "missing",
  };
}

export function buildStackUrl(
  config: ContentstackConfig,
  contentTypeUid?: string,
): string {
  const appHost =
    config.region === "eu"
      ? "https://eu-app.contentstack.com"
      : "https://app.contentstack.com";
  if (contentTypeUid) {
    return `${appHost}/#!/stack/${config.apiKey}/content-type/${contentTypeUid}/entries`;
  }
  return `${appHost}/#!/stack/${config.apiKey}/dashboard`;
}
