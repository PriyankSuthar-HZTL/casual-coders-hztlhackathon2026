"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AtlassianConfig,
  ConfluenceSpace,
  ContentstackConfig,
  DetectedComponent,
  DetectionMode,
  IntegrationComponentSyncState,
  JiraProject,
  LlmConfig,
  MatchResult,
  MigrationResult,
  PageTypeInfo,
  StepKey,
  Region,
  UrlMode,
} from "@/types";

// —— SSR-safe storage: falls back to a no-op on the server ——
const noopStorage: Storage = {
  length: 0,
  clear: () => {},
  getItem: () => null,
  key: () => null,
  removeItem: () => {},
  setItem: () => {},
};

const safeStorage = (): Storage =>
  typeof window === "undefined" ? noopStorage : localStorage;

interface StackshiftState {
  // ——— nav ———
  currentStep: StepKey;
  /** Open the config panel as an overlay, separately from the main step flow. */
  configPanelOpen: boolean;
  /** Open the LLM settings panel as an overlay. */
  llmPanelOpen: boolean;

  // ——— LLM config (persisted) ———
  llmConfig: LlmConfig;
  detectionMode: DetectionMode;
  /** Which method was actually used in the last scan */
  detectionMethod: string | null;

  // ——— config (persisted) ———
  config: ContentstackConfig;
  connectionOk: boolean;
  contentTypeCount: number | null;
  stackName: string | null;
  connectedAt: number | null;

  // ——— jira / confluence (persisted) ———
  atlassianConfig: AtlassianConfig;
  atlassianConnected: boolean;
  jiraProjects: JiraProject[];
  confluenceSpaces: ConfluenceSpace[];
  selectedJiraProjectId: string | null;
  selectedConfluenceSpaceKey: string | null;
  /** Per-component Jira/Confluence IDs after a successful sync — avoids duplicate creates. */
  integrationSyncByComponentId: Record<string, IntegrationComponentSyncState>;

  // ——— url step ———
  url: string;
  urlMode: UrlMode;
  /** URLs parsed from the CSV file in multi-URL mode */
  multiUrls: string[];
  dryRun: boolean;
  uploadAssets: boolean;

  // ——— detect ———
  components: DetectedComponent[];
  selectedIds: string[];

  // ——— match ———
  matches: MatchResult[];

  // ——— page ———
  availablePageTypes: PageTypeInfo[];
  selectedPageTypeUid: string | null;
  selectedPageTypeTitle: string | null;
  /** Component instance IDs selected to be included in the page's Modular Blocks */
  pageComponentIds: string[];
  /** URL slug for the page entry, e.g. "/about-us" — editable in PageStep */
  pageEntryUrl: string;
  /** Display title for the page entry — editable in PageStep */
  pageEntryTitle: string;

  // ——— preview ———
  activeComponentId: string | null;

  // ——— done ———
  migrationResult: MigrationResult | null;

  // ——— actions ———
  setStep: (s: StepKey) => void;
  setConfigPanelOpen: (open: boolean) => void;
  setLlmPanelOpen: (open: boolean) => void;
  setLlmConfig: (c: Partial<LlmConfig>) => void;
  setDetectionMode: (mode: DetectionMode) => void;
  setDetectionMethod: (method: string | null) => void;

  setConfig: (c: Partial<ContentstackConfig>) => void;
  setConnectionOk: (
    ok: boolean,
    count?: number,
    stackName?: string | null,
  ) => void;
  disconnect: () => void;
  setAtlassianConfig: (c: Partial<AtlassianConfig>) => void;
  setAtlassianConnected: (ok: boolean) => void;
  setJiraProjects: (projects: JiraProject[]) => void;
  setConfluenceSpaces: (spaces: ConfluenceSpace[]) => void;
  setSelectedJiraProjectId: (projectId: string | null) => void;
  setSelectedConfluenceSpaceKey: (spaceKey: string | null) => void;
  disconnectAtlassian: () => void;
  mergeIntegrationSync: (
    componentId: string,
    patch: IntegrationComponentSyncState,
  ) => void;
  clearIntegrationSync: () => void;

  setUrl: (u: string) => void;
  setUrlMode: (mode: UrlMode) => void;
  setMultiUrls: (urls: string[]) => void;
  setDryRun: (b: boolean) => void;
  setUploadAssets: (b: boolean) => void;

  setComponents: (c: DetectedComponent[]) => void;
  toggleComponentSelected: (id: string) => void;
  selectAll: () => void;
  selectNone: () => void;

  setMatches: (m: MatchResult[]) => void;
  setMatchWillCreate: (componentId: string, willCreate: boolean) => void;
  setMatchResolved: (
    componentId: string,
    contentTypeUid: string,
    contentTypeTitle: string,
  ) => void;

  setAvailablePageTypes: (types: PageTypeInfo[]) => void;
  setSelectedPageType: (uid: string | null, title: string | null) => void;
  setPageComponentIds: (ids: string[]) => void;
  togglePageComponentId: (id: string) => void;
  setPageEntryUrl: (url: string) => void;
  setPageEntryTitle: (title: string) => void;

  setActiveComponent: (id: string | null) => void;
  updateComponentField: (
    componentId: string,
    fieldUid: string,
    value: unknown,
  ) => void;
  updateComponentName: (componentId: string, name: string) => void;

  setMigrationResult: (r: MigrationResult | null) => void;
  reset: () => void;
}

const defaultConfig: ContentstackConfig = {
  apiKey: "",
  managementToken: "",
  environment: "development",
  region: (process.env.NEXT_PUBLIC_DEFAULT_REGION as Region) ?? "na",
};

const defaultAtlassianConfig: AtlassianConfig = {
  siteUrl: "",
  email: "",
  apiToken: "",
};

export const useStackshift = create<StackshiftState>()(
  persist(
    (set) => ({
      // After connection, the main flow starts at "url" — config is out-of-band.
      currentStep: "url",
      configPanelOpen: false,
      llmPanelOpen: false,

      llmConfig: {
        provider: "gemini",
        apiKey: "",
        model: "gemini-1.5-flash",
        enabled: false,
        fallbackProvider: undefined,
        fallbackApiKey: "",
        fallbackModel: "",
      },
      detectionMode: "heuristic",
      detectionMethod: null,

      config: defaultConfig,
      connectionOk: false,
      contentTypeCount: null,
      stackName: null,
      connectedAt: null,

      atlassianConfig: defaultAtlassianConfig,
      atlassianConnected: false,
      jiraProjects: [],
      confluenceSpaces: [],
      selectedJiraProjectId: null,
      selectedConfluenceSpaceKey: null,
      integrationSyncByComponentId: {},

      url: "",
      urlMode: "single",
      multiUrls: [],
      dryRun: false,
      uploadAssets: true,

      components: [],
      selectedIds: [],

      matches: [],

      availablePageTypes: [],
      selectedPageTypeUid: null,
      selectedPageTypeTitle: null,
      pageComponentIds: [],
      pageEntryUrl: "/",
      pageEntryTitle: "Home",

      activeComponentId: null,

      migrationResult: null,

      // ——— actions ———
      setStep: (s) => set({ currentStep: s }),
      setConfigPanelOpen: (open) => set({ configPanelOpen: open }),
      setLlmPanelOpen: (open) => set({ llmPanelOpen: open }),
      setLlmConfig: (c) =>
        set((state) => ({ llmConfig: { ...state.llmConfig, ...c } })),
      setDetectionMode: (mode) => set({ detectionMode: mode }),
      setDetectionMethod: (method) => set({ detectionMethod: method }),

      setConfig: (c) =>
        set((state) => ({ config: { ...state.config, ...c } })),

      setConnectionOk: (ok, count, stackName) =>
        set({
          connectionOk: ok,
          contentTypeCount: count ?? null,
          stackName: stackName ?? null,
          connectedAt: ok ? Date.now() : null,
        }),

      disconnect: () =>
        set({
          connectionOk: false,
          contentTypeCount: null,
          stackName: null,
          connectedAt: null,
          config: { ...defaultConfig },
          currentStep: "url",
          configPanelOpen: false,
          components: [],
          selectedIds: [],
          matches: [],
          activeComponentId: null,
          migrationResult: null,
          url: "",
          atlassianConnected: false,
          jiraProjects: [],
          confluenceSpaces: [],
          selectedJiraProjectId: null,
          selectedConfluenceSpaceKey: null,
          integrationSyncByComponentId: {},
        }),

      setAtlassianConfig: (c) =>
        set((state) => ({
          atlassianConfig: { ...state.atlassianConfig, ...c },
        })),
      setAtlassianConnected: (ok) => set({ atlassianConnected: ok }),
      setJiraProjects: (projects) => set({ jiraProjects: projects }),
      setConfluenceSpaces: (spaces) => set({ confluenceSpaces: spaces }),
      setSelectedJiraProjectId: (projectId) =>
        set({ selectedJiraProjectId: projectId }),
      setSelectedConfluenceSpaceKey: (spaceKey) =>
        set({ selectedConfluenceSpaceKey: spaceKey }),
      disconnectAtlassian: () =>
        set({
          atlassianConnected: false,
          atlassianConfig: defaultAtlassianConfig,
          jiraProjects: [],
          confluenceSpaces: [],
          selectedJiraProjectId: null,
          selectedConfluenceSpaceKey: null,
          integrationSyncByComponentId: {},
        }),

      mergeIntegrationSync: (componentId, patch) =>
        set((state) => ({
          integrationSyncByComponentId: {
            ...state.integrationSyncByComponentId,
            [componentId]: {
              ...state.integrationSyncByComponentId[componentId],
              ...patch,
            },
          },
        })),

      clearIntegrationSync: () => set({ integrationSyncByComponentId: {} }),

      setUrl: (u) => set({ url: u }),
      setUrlMode: (mode) => set({ urlMode: mode }),
      setMultiUrls: (urls) => set({ multiUrls: urls }),
      setDryRun: (b) => set({ dryRun: b }),
      setUploadAssets: (b) => set({ uploadAssets: b }),

      setComponents: (c) =>
        set({
          components: c,
          selectedIds: c.map((x) => x.id),
          activeComponentId: c[0]?.id ?? null,
          integrationSyncByComponentId: {},
        }),

      toggleComponentSelected: (id) =>
        set((state) => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((x) => x !== id)
            : [...state.selectedIds, id],
        })),

      selectAll: () =>
        set((state) => ({ selectedIds: state.components.map((c) => c.id) })),
      selectNone: () => set({ selectedIds: [] }),

      setMatches: (m) => set({ matches: m }),

      setMatchWillCreate: (componentId, willCreate) =>
        set((state) => ({
          matches: state.matches.map((m) =>
            m.componentId === componentId ? { ...m, willCreate } : m,
          ),
        })),

      setMatchResolved: (componentId, contentTypeUid, contentTypeTitle) =>
        set((state) => ({
          matches: state.matches.map((m) =>
            m.componentId === componentId
              ? {
                  ...m,
                  status: "matched",
                  contentTypeUid,
                  contentTypeTitle,
                  willCreate: false,
                }
              : m,
          ),
        })),

      setAvailablePageTypes: (types) => set({ availablePageTypes: types }),

      setSelectedPageType: (uid, title) =>
        set({ selectedPageTypeUid: uid, selectedPageTypeTitle: title }),

      setPageComponentIds: (ids) => set({ pageComponentIds: ids }),

      togglePageComponentId: (id) =>
        set((state) => ({
          pageComponentIds: state.pageComponentIds.includes(id)
            ? state.pageComponentIds.filter((x) => x !== id)
            : [...state.pageComponentIds, id],
        })),

      setPageEntryUrl:   (url)   => set({ pageEntryUrl: url }),
      setPageEntryTitle: (title) => set({ pageEntryTitle: title }),

      setActiveComponent: (id) => set({ activeComponentId: id }),

      updateComponentField: (componentId, fieldUid, value) =>
        set((state) => ({
          components: state.components.map((c) =>
            c.id !== componentId
              ? c
              : {
                  ...c,
                  fields: c.fields.map((f) =>
                    f.uid === fieldUid ? { ...f, value } : f,
                  ),
                },
          ),
        })),

      updateComponentName: (componentId, name) =>
        set((state) => ({
          components: state.components.map((c) =>
            c.id === componentId ? { ...c, name } : c,
          ),
        })),

      setMigrationResult: (r) => set({ migrationResult: r }),

      reset: () =>
        set({
          currentStep: "url",
          url: "",
          multiUrls: [],
          components: [],
          selectedIds: [],
          matches: [],
          availablePageTypes: [],
          selectedPageTypeUid: null,
          selectedPageTypeTitle: null,
          pageComponentIds: [],
          pageEntryUrl: "/",
          pageEntryTitle: "Home",
          activeComponentId: null,
          migrationResult: null,
          atlassianConnected: false,
          jiraProjects: [],
          confluenceSpaces: [],
          selectedJiraProjectId: null,
          selectedConfluenceSpaceKey: null,
          integrationSyncByComponentId: {},
        }),
    }),
    {
      name: "stackshift-v1",
      storage: createJSONStorage(safeStorage),
      // Persist credentials + connection so users don't re-auth every session.
      // Everything else is ephemeral migration state.
      partialize: (state) => ({
        config: state.config,
        connectionOk: state.connectionOk,
        contentTypeCount: state.contentTypeCount,
        stackName: state.stackName,
        connectedAt: state.connectedAt,
        atlassianConfig: state.atlassianConfig,
        selectedJiraProjectId: state.selectedJiraProjectId,
        selectedConfluenceSpaceKey: state.selectedConfluenceSpaceKey,
        integrationSyncByComponentId: state.integrationSyncByComponentId,
        llmConfig: state.llmConfig,
        detectionMode: state.detectionMode,
        urlMode: state.urlMode,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StackshiftState>;
        return {
          ...current,
          ...p,
          llmConfig: p.llmConfig
            ? {
                ...current.llmConfig,
                ...p.llmConfig,
                provider:
                  p.llmConfig.provider === "anthropic"
                    ? "anthropic"
                    : p.llmConfig.provider === "groq"
                      ? "groq"
                      : "gemini",
              }
            : current.llmConfig,
        };
      },
      // Crucial for Next.js App Router: skip auto-hydration so server and client
      // render identical initial HTML. We rehydrate manually on mount below.
      skipHydration: true,
    },
  ),
);

// —— client-only rehydration hook ——
// Gates initial render until persisted state has been read from localStorage.
// Prevents the hydration-mismatch → re-render loop that otherwise shows up
// as "infinite loop" in dev mode.
export function useStoreHydration(): boolean {
  const [hydrated, setHydrated] = useState<boolean>(() =>
    useStackshift.persist.hasHydrated(),
  );

  useEffect(() => {
    const unsub = useStackshift.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    void useStackshift.persist.rehydrate();
    if (useStackshift.persist.hasHydrated()) setHydrated(true);
    return () => {
      unsub();
    };
  }, []);

  return hydrated;
}
