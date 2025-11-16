import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useOnboarding, OnboardingWizardChoice } from "@/hooks/use-onboarding";
import { analytics } from "@/lib/analytics";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OnboardingWizard } from "./OnboardingWizard";

export function OnboardingManager() {
  const { state, markWelcomeSeen, startWizard, completeWizard, setLastChoice } = useOnboarding();
  const [location] = useLocation();
  const [localWizardOpen, setLocalWizardOpen] = useState(false);

  useEffect(() => {
    if (!state.hasSeenWelcome && !state.wizardCompleted) {
      setLocalWizardOpen(true);
    }
  }, [state.hasSeenWelcome, state.wizardCompleted]);

  useEffect(() => {
    if (!state.hasSeenWelcome || state.wizardCompleted) {
      return;
    }
    setLocalWizardOpen(true);
  }, [location, state.hasSeenWelcome, state.wizardCompleted]);

  const handleStart = () => {
    if (!state.wizardStarted) {
      analytics.onboardingStarted();
    }
    markWelcomeSeen();
    startWizard();
  };

  const handleChoice = (choice: OnboardingWizardChoice) => {
    setLastChoice(choice);
    if (!state.wizardStarted) {
      analytics.onboardingStarted();
      startWizard(choice);
    }
  };

  const handleComplete = () => {
    completeWizard();
    analytics.onboardingCompleted();
  };

  const showWelcome = !state.hasSeenWelcome && !state.wizardCompleted;

  return (
    <>
      <Dialog open={showWelcome && localWizardOpen} onOpenChange={setLocalWizardOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-2">Welcome! You&apos;re in 🎉</h2>
              <p className="text-sm text-muted-foreground mb-2">
                Thanks for trying ImageUpscaler. I built this tool for Etsy digital art &amp; wall-art sellers to create
                listing-ready images fast — without spending hours in Canva or Photoshop.
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                To help you get started, we&apos;ve set up a quick 3-step wizard that walks you through your first Etsy
                listing bundle.
              </p>
              <p className="text-sm text-muted-foreground">Let&apos;s get you to your first result!</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleStart} className="w-full sm:w-auto">
                Start
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {state.hasSeenWelcome && !state.wizardCompleted && (
        <OnboardingWizard
          lastChoice={state.lastChoice}
          onChoice={handleChoice}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}
