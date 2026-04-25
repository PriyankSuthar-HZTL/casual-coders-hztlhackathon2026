module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/http2 [external] (http2, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http2", () => require("http2"));

module.exports = mod;
}),
"[externals]/assert [external] (assert, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("assert", () => require("assert"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[project]/src/lib/entry-title.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Builds the title sent to Contentstack. Appends a local timestamp with
// seconds so re-runs don't collide with Contentstack's unique-title constraint.
__turbopack_context__.s([
    "entryTitle",
    ()=>entryTitle
]);
function entryTitle(base, at = new Date()) {
    const pad = (n)=>String(n).padStart(2, "0");
    const stamp = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}` + ` ${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`;
    const trimmed = (base || "Untitled").trim();
    return `${trimmed} — ${stamp}`;
}
}),
"[project]/src/lib/contentstack.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "REGION_HOSTS",
    ()=>REGION_HOSTS,
    "buildEntryPayload",
    ()=>buildEntryPayload,
    "buildStackUrl",
    ()=>buildStackUrl,
    "client",
    ()=>client,
    "createContentType",
    ()=>createContentType,
    "createEntry",
    ()=>createEntry,
    "describeCsError",
    ()=>describeCsError,
    "fieldToSchema",
    ()=>fieldToSchema,
    "generateContentTypeSchema",
    ()=>generateContentTypeSchema,
    "getContentType",
    ()=>getContentType,
    "listContentTypes",
    ()=>listContentTypes,
    "matchComponent",
    ()=>matchComponent,
    "uploadAssetFromUrl",
    ()=>uploadAssetFromUrl
]);
// ——————————————————————————————————————
//  Stackshift — Contentstack Management API client
//  Thin wrapper around axios; avoids the SDK weight.
// ——————————————————————————————————————
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/axios/lib/axios.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$form$2d$data$2f$lib$2f$form_data$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/form-data/lib/form_data.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$entry$2d$title$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/entry-title.ts [app-route] (ecmascript)");
;
;
;
const REGION_HOSTS = {
    na: "https://api.contentstack.io",
    eu: "https://eu-api.contentstack.com",
    au: "https://au-api.contentstack.com",
    "azure-na": "https://azure-na-api.contentstack.com",
    "azure-eu": "https://azure-eu-api.contentstack.com",
    "gcp-na": "https://gcp-na-api.contentstack.com"
};
function client(config) {
    const headers = {
        api_key: config.apiKey,
        "Content-Type": "application/json"
    };
    if (config.authToken) {
        headers.authtoken = config.authToken;
    } else if (config.managementToken) {
        headers.authorization = config.managementToken;
    }
    const instance = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].create({
        baseURL: REGION_HOSTS[config.region] ?? REGION_HOSTS.na,
        headers,
        timeout: 30_000
    });
    instance.interceptors.request.use((req)=>{
        const method = (req.method ?? "GET").toUpperCase();
        const url = `${req.baseURL ?? ""}${req.url ?? ""}`;
        console.log(`[CS →] ${method} ${url}`);
        if (req.data) {
            const preview = JSON.stringify(req.data);
            console.log(`[CS →] body: ${preview.length > 800 ? `${preview.slice(0, 800)}… (${preview.length} chars)` : preview}`);
        }
        return req;
    });
    instance.interceptors.response.use((res)=>{
        const method = (res.config.method ?? "GET").toUpperCase();
        console.log(`[CS ←] ${res.status} ${method} ${res.config.url ?? ""}`);
        return res;
    }, (err)=>{
        if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(err)) {
            const method = (err.config?.method ?? "GET").toUpperCase();
            const status = err.response?.status ?? "no-response";
            console.error(`[CS ✕] ${status} ${method} ${err.config?.url ?? ""} — ${err.message}`);
            if (err.response?.data) {
                console.error(`[CS ✕] body: ${JSON.stringify(err.response.data, null, 2)}`);
            }
        } else {
            console.error("[CS ✕]", err);
        }
        return Promise.reject(err);
    });
    return instance;
}
function describeCsError(err) {
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(err)) {
        return err instanceof Error ? err.message : "unknown_error";
    }
    const data = err.response?.data;
    const base = data?.error_message ?? err.message;
    if (data?.errors) {
        const parts = Object.entries(data.errors).map(([k, v])=>`${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("; ");
        return parts ? `${base} — ${parts}` : base;
    }
    return base;
}
async function listContentTypes(config) {
    const res = await client(config).get("/v3/content_types", {
        params: {
            include_count: true,
            limit: 100
        }
    });
    return res.data?.content_types ?? [];
}
async function getContentType(config, uid) {
    try {
        const res = await client(config).get(`/v3/content_types/${uid}`);
        return res.data?.content_type ?? null;
    } catch (err) {
        // 404/422 → missing. Rethrow other errors so callers can see real problems.
        const status = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(err) ? err.response?.status : undefined;
        if (status === 404 || status === 422) return null;
        throw err;
    }
}
async function createContentType(config, ct) {
    const res = await client(config).post("/v3/content_types", {
        content_type: ct
    });
    return res.data.content_type;
}
async function createEntry(config, contentTypeUid, entry) {
    const res = await client(config).post(`/v3/content_types/${contentTypeUid}/entries`, {
        entry
    });
    return {
        uid: res.data.entry.uid
    };
}
async function uploadAssetFromUrl(config, url) {
    try {
        // Download the asset.
        const dl = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].get(url, {
            responseType: "arraybuffer",
            timeout: 15_000
        });
        const buf = Buffer.from(dl.data);
        const filename = url.split("/").pop()?.split("?")[0] || "asset";
        const rawType = dl.headers["content-type"];
        const contentType = typeof rawType === "string" && rawType.length > 0 ? rawType : "application/octet-stream";
        const form = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$form$2d$data$2f$lib$2f$form_data$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]();
        form.append("asset[upload]", buf, {
            filename,
            contentType
        });
        const res = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].post(`${REGION_HOSTS[config.region] ?? REGION_HOSTS.na}/v3/assets`, form, {
            headers: {
                api_key: config.apiKey,
                ...config.authToken ? {
                    authtoken: config.authToken
                } : {
                    authorization: config.managementToken
                },
                ...form.getHeaders()
            },
            timeout: 30_000
        });
        const asset = res.data.asset;
        console.log(`[CS ←] asset uploaded ${asset.uid} ← ${url}`);
        return {
            uid: asset.uid,
            url: asset.url
        };
    } catch (err) {
        if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(err)) {
            console.error(`[CS ✕] asset upload failed for ${url}: ${err.response?.status ?? "no-response"} ${err.message}`);
            if (err.response?.data) {
                console.error(`[CS ✕] asset body: ${JSON.stringify(err.response.data, null, 2)}`);
            }
        } else {
            console.error(`[CS ✕] asset upload failed for ${url}:`, err);
        }
        return null;
    }
}
// ——— Schema generation ———
const TYPE_MAP = {
    single_line: "text",
    multi_line: "text",
    rich_text: "text",
    url: "link",
    file: "file",
    boolean: "boolean",
    number: "number",
    group: "group",
    reference: "reference"
};
function fieldToSchema(f) {
    const base = {
        display_name: f.displayName,
        uid: f.uid,
        data_type: TYPE_MAP[f.type] ?? "text",
        mandatory: f.required ?? false
    };
    if (f.type === "multi_line") {
        base.field_metadata = {
            multiline: true
        };
    }
    if (f.type === "rich_text") {
        base.field_metadata = {
            allow_rich_text: true,
            multiline: true,
            rich_text_type: "advanced"
        };
    }
    if (f.type === "group") {
        base.multiple = true;
        base.schema = (f.itemSchema ?? []).map(fieldToSchema);
    }
    return base;
}
function generateContentTypeSchema(component) {
    const fields = component.fields.map(fieldToSchema);
    // Ensure a mandatory title field exists and is marked _default.
    const hasTitle = fields.some((f)=>f.uid === "title");
    if (!hasTitle) {
        fields.unshift({
            display_name: "Title",
            uid: "title",
            data_type: "text",
            mandatory: true,
            unique: false,
            _default: true
        });
    } else {
        fields.forEach((f)=>{
            if (f.uid === "title") f._default = true;
        });
    }
    return {
        title: component.name,
        uid: component.suggestedUid,
        description: `Auto-generated by Stackshift (${component.kind})`,
        schema: fields,
        options: {
            title: "title",
            sub_title: [],
            is_page: false,
            singleton: false
        }
    };
}
async function buildEntryPayload(config, component, opts) {
    const base = component.name || firstStringField(component.fields) || "Untitled";
    const entry = {
        title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$entry$2d$title$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["entryTitle"])(base)
    };
    for (const f of component.fields){
        if (f.uid === "title") continue;
        entry[f.uid] = await serializeField(config, f, opts.uploadAssets);
    }
    return entry;
}
async function serializeField(config, f, uploadAssets) {
    switch(f.type){
        case "file":
            {
                const src = f.assetUrl ?? (typeof f.value === "string" ? f.value : "");
                if (!uploadAssets || !src) return "";
                const asset = await uploadAssetFromUrl(config, src);
                return asset?.uid ?? "";
            }
        case "group":
            {
                const items = f.value ?? [];
                const schema = f.itemSchema ?? [];
                if (!schema.length || !items.length) return items;
                return Promise.all(items.map(async (item)=>{
                    if (!item || typeof item !== "object") return item;
                    const src = item;
                    const out = {};
                    for (const s of schema){
                        const raw = src[s.uid];
                        const synthetic = {
                            uid: s.uid,
                            displayName: s.displayName,
                            type: s.type,
                            value: raw,
                            assetUrl: s.type === "file" && typeof raw === "string" ? raw : undefined,
                            itemSchema: s.itemSchema
                        };
                        out[s.uid] = await serializeField(config, synthetic, uploadAssets);
                    }
                    return out;
                }));
            }
        case "url":
            {
                const v = f.value;
                if (typeof v === "string") return {
                    title: v,
                    href: v
                };
                const vo = v;
                return {
                    title: vo?.title ?? "",
                    href: vo?.href ?? ""
                };
            }
        default:
            return f.value ?? "";
    }
}
function firstStringField(fields) {
    for (const f of fields){
        if ((f.type === "single_line" || f.type === "multi_line") && f.value) {
            return String(f.value);
        }
    }
    return "";
}
// ——— Matching ———
const tokenize = (s)=>s.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter(Boolean);
function similarity(a, b) {
    const A = new Set(tokenize(a));
    const B = new Set(tokenize(b));
    if (!A.size || !B.size) return 0;
    const inter = [
        ...A
    ].filter((t)=>B.has(t)).length;
    const union = new Set([
        ...A,
        ...B
    ]).size;
    return union ? inter / union : 0;
}
function matchComponent(component, existing) {
    // 1. Exact UID match
    const exact = existing.find((ct)=>ct.uid === component.suggestedUid);
    if (exact) {
        return {
            componentId: component.id,
            status: "matched",
            contentTypeUid: exact.uid,
            contentTypeTitle: exact.title,
            similarity: 1
        };
    }
    // 2. Fuzzy title match
    let best = null;
    for (const ct of existing){
        const score = Math.max(similarity(component.name, ct.title), similarity(component.suggestedUid, ct.uid));
        if (!best || score > best.score) best = {
            ct,
            score
        };
    }
    const score = best?.score ?? 0;
    let status;
    if (score >= 0.75) status = "matched";
    else if (score >= 0.4) status = "partial";
    else status = "missing";
    return {
        componentId: component.id,
        status,
        contentTypeUid: status !== "missing" ? best?.ct.uid : undefined,
        contentTypeTitle: status !== "missing" ? best?.ct.title : undefined,
        similarity: score,
        willCreate: status === "missing"
    };
}
function buildStackUrl(config, contentTypeUid) {
    const appHost = config.region === "eu" ? "https://eu-app.contentstack.com" : "https://app.contentstack.com";
    if (contentTypeUid) {
        return `${appHost}/#!/stack/${config.apiKey}/content-type/${contentTypeUid}/entries`;
    }
    return `${appHost}/#!/stack/${config.apiKey}/dashboard`;
}
}),
"[project]/src/app/api/contentstack/create-content-type/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/axios/lib/axios.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$contentstack$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/contentstack.ts [app-route] (ecmascript)");
;
;
;
const runtime = "nodejs";
async function POST(request) {
    const body = await request.json();
    if (!body?.config?.apiKey || !body?.component) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: false,
            error: "bad_request"
        }, {
            status: 400
        });
    }
    const schema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$contentstack$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateContentTypeSchema"])(body.component);
    try {
        // Idempotent — if a CT with this UID already exists, return it instead of failing.
        const existing = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$contentstack$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getContentType"])(body.config, schema.uid);
        if (existing) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                ok: true,
                contentType: existing
            });
        }
        const created = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$contentstack$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createContentType"])(body.config, schema);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true,
            contentType: created
        });
    } catch (err) {
        const message = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].isAxiosError(err) ? err.response?.data?.error_message || err.message : err instanceof Error ? err.message : "create_failed";
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: false,
            error: message
        }, {
            status: 502
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0ecl7tg._.js.map