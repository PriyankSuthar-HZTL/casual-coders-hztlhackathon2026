"use client";

import Masthead from "@/components/Masthead";
import Stepper from "@/components/Stepper";
import ConnectPanel from "@/components/ConnectPanel";
import LlmSettingsPanel from "@/components/LlmSettingsPanel";
import LoginPanel from "@/components/LoginPanel";
import UrlStep from "@/components/steps/UrlStep";
import DetectStep from "@/components/steps/DetectStep";
import MatchStep from "@/components/steps/MatchStep";
import IntegrationsStep from "@/components/steps/IntegrationsStep";
import PageStep from "@/components/steps/PageStep";
import PreviewStep from "@/components/steps/PreviewStep";
import DoneStep from "@/components/steps/DoneStep";
import { useStackshift, useStoreHydration } from "@/store";
import { Loader2 } from "lucide-react";

export default function Home() {
  const hydrated = useStoreHydration();
  const step = useStackshift((s) => s.currentStep);
  const connectionOk = useStackshift((s) => s.connectionOk);
  const configPanelOpen = useStackshift((s) => s.configPanelOpen);
  const setConfigPanelOpen = useStackshift((s) => s.setConfigPanelOpen);
  const llmPanelOpen = useStackshift((s) => s.llmPanelOpen);
  const setLlmPanelOpen = useStackshift((s) => s.setLlmPanelOpen);

  const mainClass =
    "mx-auto max-w-[1400px] px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12 animate-stage-in";

  if (!hydrated) {
    return (
      <>
        <Masthead />
        <main className={mainClass}>
          <div
            className="flex flex-col items-start gap-3 rounded-xl border border-line bg-card px-6 py-8 shadow-card-md sm:flex-row sm:items-center"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2
              className="h-5 w-5 shrink-0 animate-spin text-accent"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium text-ink">Restoring session…</p>
              <p className="mt-0.5 text-sm text-muted">
                Loading saved connection and wizard state.
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!connectionOk) {
    return (
      <>
        <Masthead />
        <main className={mainClass}>
          <LoginPanel />
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <Masthead />
      <main className={mainClass}>
        <Stepper />
        {step === "url" && <UrlStep />}
        {step === "detect" && <DetectStep />}
        {step === "integrations" && <IntegrationsStep />}
        {step === "match" && <MatchStep />}
        {step === "page" && <PageStep />}
        {step === "preview" && <PreviewStep />}
        {step === "done" && <DoneStep />}
      </main>

      {configPanelOpen && (
        <ConnectPanel
          mode="settings"
          onClose={() => setConfigPanelOpen(false)}
        />
      )}
      {llmPanelOpen && (
        <LlmSettingsPanel onClose={() => setLlmPanelOpen(false)} />
      )}

      <SiteFooter />
    </>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-paper-2/80 px-4 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-2 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <span className="font-medium text-ink/80">MigrateX</span>
        <span className="text-muted-soft">
          Lift and shift, minus the shift.
        </span>
      </div>
    </footer>
  );
}
