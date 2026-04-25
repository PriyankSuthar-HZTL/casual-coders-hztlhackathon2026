---
name: stackshift-frontend
description: >-
  Wizard step workflows: adding new steps, step panel layout, API call wiring,
  navigation logic. Use when adding a wizard step, building a step panel, or
  modifying wizard navigation flow.
---

# Stackshift Wizard Steps

## Adding a New Step

1. Add step key to `StepKey` union in `src/types/index.ts`
2. Create `src/components/steps/{Name}Step.tsx`
3. Add entry to `STEPS` array in `src/components/Stepper.tsx` (key, label, hint)
4. Add conditional render in `src/app/page.tsx`: `{step === "key" && <NameStep />}`
5. Add any needed store state/actions in `src/store/index.ts`

## Step Panel Layout

Every step follows: step number (mono, accent) → serif headline with italic accent word → muted description → card with hard shadow. Refer to `UrlStep.tsx` or `DetectStep.tsx`.

## API Call Workflow

1. Local `loading` state via `useState`
2. `fetch("/api/{route}", { method: "POST", ... })` with typed body
3. Cast response as `{Action}Response` from `@/types`, check `data.ok`
4. On success, push data into store and `setStep()` forward

## Navigation Rules

- Forward: via `setStep()` after successful API calls
- Backward: clicking previous step pills (enforced in `Stepper.tsx`)
- Reset: `reset()` returns to URL step (used from `DoneStep`)

## Loading & Error Pattern

- Spinner: inline `<span>` with `animate-spin` border trick
- Errors: `text-accent` message with `AlertCircle` icon beside the button
- Sub-components: private functions at bottom of file, not exported

For design tokens see [reference.md](reference.md).
