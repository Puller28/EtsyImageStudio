import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useOnboarding } from "@/hooks/use-onboarding";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/workspace-context";

interface Tip {
  id: string;
  title: string;
  body: string;
  target: string;
}

const STATIC_TIPS: Pick<Tip, "id" | "title" | "body" | "target">[] = [
  {
    id: "mockups",
    title: "Choose mockup style",
    body: "Pick the mockup style that best fits your Etsy shop’s brand.",
    target: "mockups",
  },
  {
    id: "download",
    title: "Download your listing-ready set",
    body: "These images match Etsy’s recommended ratios — ready to publish immediately.",
    target: "download",
  },
];

interface TooltipPosition {
  top: number;
  left: number;
  placement: "top" | "bottom";
}

export function OnboardingTips() {
  const { state, markTooltipsShown } = useOnboarding();
  const [location] = useLocation();
  const { selectedProjectId } = useWorkspace();
  const [index, setIndex] = useState(0);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [highlightedEl, setHighlightedEl] = useState<HTMLElement | null>(null);

  const shouldShow = state.wizardCompleted && !state.firstSessionTooltipsShown;
  const needsProject = location.startsWith("/workflow") && !selectedProjectId;

  const tips = useMemo<Tip[]>(() => {
    const firstTip: Tip = needsProject
      ? {
          id: "create-project",
          title: "Create your first project",
          body: "Create a workspace project here to unlock uploads and tracking.",
          target: "create-project",
        }
      : {
          id: "upload",
          title: "Upload your artwork",
          body: "Upload your artwork here — any PNG or JPG works, even low-resolution images.",
          target: "upload",
        };
    return [firstTip, ...STATIC_TIPS];
  }, [needsProject]);

  const currentTip = tips[index];

  useEffect(() => {
    if (!shouldShow) {
      setHighlightedEl(null);
      return;
    }

    const updatePosition = () => {
      if (!currentTip) return;
      const target = document.querySelector(`[data-onboarding-target="${currentTip.target}"]`) as HTMLElement | null;

      if (!target) {
        setPosition(null);
        setHighlightedEl(null);
        return;
      }

      setHighlightedEl(target);
      const rect = target.getBoundingClientRect();
      const placement: TooltipPosition["placement"] = rect.top > window.innerHeight / 2 ? "top" : "bottom";
      const top = placement === "top" ? rect.top + window.scrollY : rect.bottom + window.scrollY;
      const left = rect.left + window.scrollX + rect.width / 2;
      setPosition({ top, left, placement });
    };

    const timeoutId = window.setTimeout(updatePosition, 200);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    const observer = new MutationObserver(() => updatePosition());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      observer.disconnect();
    };
  }, [shouldShow, currentTip, location]);

  useEffect(() => {
    if (!highlightedEl) return;
    const previousOutline = highlightedEl.style.outline;
    const previousOffset = highlightedEl.style.outlineOffset;
    highlightedEl.style.outline = "3px solid rgba(99, 102, 241, 0.7)";
    highlightedEl.style.outlineOffset = "4px";
    return () => {
      highlightedEl.style.outline = previousOutline;
      highlightedEl.style.outlineOffset = previousOffset;
    };
  }, [highlightedEl]);

  if (!shouldShow || !currentTip) {
    return null;
  }

  const handleAdvance = () => {
    if (index < tips.length - 1) {
      setIndex((prev) => prev + 1);
      setPosition(null);
      setHighlightedEl(null);
    } else {
      markTooltipsShown();
    }
  };

  const handleSkip = () => {
    markTooltipsShown();
  };

  const renderCard = (anchored: boolean) => (
    <div
      className={`rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl max-w-xs w-[300px] p-4 pointer-events-auto`}
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-indigo-500 mb-2">
        Tip {index + 1} of {tips.length}
      </div>
      <h3 className="text-sm font-semibold mb-1">{currentTip.title}</h3>
      <p className="text-xs text-slate-600 mb-3">{currentTip.body}</p>
      <div className="flex justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={handleSkip}>
          Skip tips
        </Button>
        <Button size="sm" onClick={handleAdvance}>
          {index < tips.length - 1 ? "Next" : "Finish"}
        </Button>
      </div>
      {!anchored && (
        <p className="text-[10px] text-slate-500 mt-2">
          Navigate to the related area to see this tip attached to the control.
        </p>
      )}
    </div>
  );

  if (position && highlightedEl) {
    return (
      <div className="fixed inset-0 z-40 pointer-events-none">
        <div
          className="absolute pointer-events-none"
          style={{
            top: position.top,
            left: position.left,
            transform: position.placement === "top" ? "translate(-50%, calc(-100% - 16px))" : "translate(-50%, 16px)",
          }}
        >
          <div className="relative pointer-events-auto">
            {renderCard(true)}
            <div
              className={`absolute left-1/2 h-3 w-3 rotate-45 bg-white border border-slate-200`}
              style={{
                transform: "translateX(-50%)",
                top: position.placement === "top" ? "100%" : undefined,
                bottom: position.placement === "top" ? undefined : "100%",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Fallback when element not yet present
  return (
    <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center pointer-events-none px-4">
      <div className="pointer-events-auto">
        {renderCard(false)}
      </div>
    </div>
  );
}
