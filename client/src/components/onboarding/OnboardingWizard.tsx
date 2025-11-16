import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Workflow, Wrench } from "lucide-react";
import { OnboardingWizardChoice } from "@/hooks/use-onboarding";
import { analytics } from "@/lib/analytics";

interface OnboardingWizardProps {
  lastChoice: OnboardingWizardChoice;
  onChoice: (choice: OnboardingWizardChoice) => void;
  onComplete: () => void;
}

export function OnboardingWizard({ lastChoice, onChoice, onComplete }: OnboardingWizardProps) {
  const [open, setOpen] = useState(true);
  const [choice, setChoice] = useState<OnboardingWizardChoice>(lastChoice);
  const [, navigate] = useLocation();

  const handleChoice = (value: OnboardingWizardChoice) => {
    setChoice(value);
    onChoice(value);
    analytics.wizardStepCompleted(1);

    if (value === "workflow") {
      navigate("/workflow/run");
    } else if (value === "tools") {
      navigate("/tools/upscale");
    }

    onComplete();
    setOpen(false);
  };

  return (
    <>
      <NavToggleCallout visible={open} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row">
            <div className="hidden sm:flex flex-col justify-between bg-slate-950 text-slate-50 px-6 py-6 w-full sm:w-72">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-indigo-300 mb-2">Pick your path</p>
                <h2 className="text-lg font-semibold mb-2">How do you want to work?</h2>
                <p className="text-xs text-slate-300">
                  Start with a guided workflow or jump straight into a specific tool. You can switch any time using the toggle highlighted at the top of the page.
                </p>
              </div>
            </div>

            <div className="flex-1 p-4 sm:p-6 space-y-4">
              <PathChoiceStep choice={choice} onSelect={handleChoice} />
              <div className="flex justify-end items-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Skip for now
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
function PathChoiceStep({ choice, onSelect }: { choice: OnboardingWizardChoice; onSelect: (choice: OnboardingWizardChoice) => void }) {
  useHighlightNavToggle();

  return (
    <div className="space-y-3">
      <h3 className="text-base sm:text-lg font-semibold">Choose how you want to work</h3>
      <p className="text-xs sm:text-sm text-muted-foreground">
        The toggle at the top of the app (highlighted now) lets you switch between a guided workflow and standalone tools. Pick where you want to start:
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ModeCard
          active={choice === "workflow"}
          onClick={() => onSelect("workflow")}
          title="Workflows"
          icon={<Workflow className="h-5 w-5" />}
          description="Follow a curated path from upload to Etsy listing."
          highlights={[
            "Upload artwork and upscale automatically",
            "Generate mockups + print-ready ratios",
            "Finish with SEO-ready Etsy copy"
          ]}
          cta="Go to Workflows"
        />
        <ModeCard
          active={choice === "tools"}
          onClick={() => onSelect("tools")}
          title="Tools"
          icon={<Wrench className="h-5 w-5" />}
          description="Jump straight into any tool whenever you need it."
          highlights={[
            "Upscale or enhance artwork on demand",
            "Generate mockups, background removal, print formats",
            "Use AI listing tools standalone"
          ]}
          cta="Browse tools"
        />
      </div>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  title,
  description,
  highlights,
  cta,
  icon,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  description: string;
  highlights: string[];
  cta: string;
  icon: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className="text-left">
      <Card
        className={
          "h-full border-2 transition-all " +
          (active
            ? "border-indigo-500 shadow-indigo-500/20 shadow-sm bg-indigo-500/5"
            : "border-slate-200/40 hover:border-indigo-300 hover:bg-slate-50/40")
        }
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600">
              {icon}
            </div>
            <div>
              <p className="text-base font-semibold leading-tight">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <ul className="space-y-1 text-xs text-slate-600">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div>
            <span className="inline-flex items-center text-sm font-medium text-indigo-600">
              {cta}
              <svg className="ml-1 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function useHighlightNavToggle() {
  useEffect(() => {
    const targetIds = ["nav-workflows", "nav-tools"];
    const elements = targetIds
      .map((id) => document.querySelector(`[data-onboarding-target="${id}"]`) as HTMLElement | null)
      .filter((el): el is HTMLElement => Boolean(el));

    const previousStyles = elements.map((el) => ({ outline: el.style.outline, outlineOffset: el.style.outlineOffset, zIndex: el.style.zIndex }));

    elements.forEach((el) => {
      el.style.outline = "3px solid rgba(99, 102, 241, 0.85)";
      el.style.outlineOffset = "4px";
      el.style.zIndex = "60";
    });

    return () => {
      elements.forEach((el, index) => {
        el.style.outline = previousStyles[index].outline;
        el.style.outlineOffset = previousStyles[index].outlineOffset;
        el.style.zIndex = previousStyles[index].zIndex;
      });
    };
  }, []);
}

function NavToggleCallout({ visible }: { visible: boolean }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!visible) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const target = document.querySelector('[data-onboarding-target="nav-workflows"]') as HTMLElement | null;
      if (!target) {
        setPosition(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 12,
        left: rect.left + window.scrollX + rect.width / 2,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [visible]);

  if (!visible || !position) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[70]">
      <div
        className="absolute flex flex-col items-center"
        style={{ top: position.top, left: position.left, transform: "translate(-50%, 0)" }}
      >
        <div className="pointer-events-auto rounded-2xl border border-white/60 bg-white/95 px-4 py-3 text-center shadow-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-indigo-500">Look up here</p>
          <p className="text-sm font-medium text-slate-900">Switch between Workflows & Tools using this toggle.</p>
          <p className="text-xs text-slate-600">You can revisit either path anytime from the top bar.</p>
        </div>
        <div className="mt-2 h-10 w-px rounded-full bg-white/80" />
      </div>
    </div>,
    document.body
  );
}
