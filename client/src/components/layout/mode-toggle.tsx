import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sparkles, Wrench } from "lucide-react";
import type { WorkspaceMode } from "@/types/workspace";
import { ReactNode } from "react";

interface ModeToggleProps {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
}

const modes: Array<{ value: WorkspaceMode; label: string; icon: ReactNode; description: string }> = [
  {
    value: "workflow",
    label: "Workflows",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    description: "Step-by-step guided flows",
  },
  {
    value: "tools",
    label: "Tools",
    icon: <Wrench className="h-3.5 w-3.5" />,
    description: "Pick any tool and dive in",
  },
];

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-full border border-slate-800 bg-slate-900/70 p-0.5">
      {modes.map((item) => {
        const isActive = item.value === mode;
        return (
          <Button
            key={item.value}
            variant="ghost"
            size="sm"
            onClick={() => onModeChange(item.value)}
            className={cn(
              "relative px-4 py-2 text-xs sm:text-sm font-medium transition",
              isActive
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800/70"
            )}
          >
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/20">
              {item.icon}
            </span>
            <div className="hidden sm:flex flex-col items-start">
              <span>{item.label}</span>
              <span className="text-[11px] font-normal text-slate-400">{item.description}</span>
            </div>
            <span className="sm:hidden">{item.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
