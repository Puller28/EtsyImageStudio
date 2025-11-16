import { useCallback, useEffect, useState } from "react";

export type OnboardingWizardChoice = "workflow" | "tools" | null;

export interface OnboardingChecklistState {
  uploadArtwork: boolean;
  generateListingBundle: boolean;
  downloadFirstImages: boolean;
  createFirstEtsyListing: boolean;
}

export interface OnboardingState {
  hasSeenWelcome: boolean;
  wizardStarted: boolean;
  wizardCompleted: boolean;
  firstSessionTooltipsShown: boolean;
  checklist: OnboardingChecklistState;
  lastChoice: OnboardingWizardChoice;
}

const STORAGE_KEY = "imageUpscaler_onboarding_v1";

const defaultChecklist: OnboardingChecklistState = {
  uploadArtwork: false,
  generateListingBundle: false,
  downloadFirstImages: false,
  createFirstEtsyListing: false,
};

const defaultState: OnboardingState = {
  hasSeenWelcome: false,
  wizardStarted: false,
  wizardCompleted: false,
  firstSessionTooltipsShown: false,
  checklist: defaultChecklist,
  lastChoice: null,
};

function loadState(): OnboardingState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return {
      ...defaultState,
      ...parsed,
      checklist: {
        ...defaultChecklist,
        ...(parsed.checklist || {}),
      },
    };
  } catch {
    return defaultState;
  }
}

function persistState(state: OnboardingState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(() => loadState());

  useEffect(() => {
    persistState(state);
  }, [state]);

  const markWelcomeSeen = useCallback(() => {
    setState((prev) => ({ ...prev, hasSeenWelcome: true }));
  }, []);

  const startWizard = useCallback((choice?: OnboardingWizardChoice) => {
    setState((prev) => ({
      ...prev,
      hasSeenWelcome: true,
      wizardStarted: true,
      lastChoice: choice ?? prev.lastChoice,
    }));
  }, []);

  const completeWizard = useCallback(() => {
    setState((prev) => ({
      ...prev,
      wizardCompleted: true,
      wizardStarted: false,
    }));
  }, []);

  const setLastChoice = useCallback((choice: OnboardingWizardChoice) => {
    setState((prev) => ({ ...prev, lastChoice: choice }));
  }, []);

  const markTooltipsShown = useCallback(() => {
    setState((prev) => ({ ...prev, firstSessionTooltipsShown: true }));
  }, []);

  const updateChecklist = useCallback((update: Partial<OnboardingChecklistState>) => {
    setState((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        ...update,
      },
    }));
  }, []);

  const resetOnboarding = useCallback(() => {
    setState(defaultState);
  }, []);

  return {
    state,
    markWelcomeSeen,
    startWizard,
    completeWizard,
    setLastChoice,
    markTooltipsShown,
    updateChecklist,
    resetOnboarding,
  };
}
