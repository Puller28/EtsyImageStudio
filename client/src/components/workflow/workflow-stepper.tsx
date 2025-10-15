import { cn } from "@/lib/utils";

interface WorkflowStep {
  title: string;
  description?: string;
}

interface WorkflowStepperProps {
  steps: WorkflowStep[];
  currentStep: number;
}

export function WorkflowStepper({ steps, currentStep }: WorkflowStepperProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <div
              key={step.title}
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm transition",
                isActive
                  ? "border-indigo-400/80 bg-indigo-500/10 text-white"
                  : isCompleted
                  ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                  : "border-slate-800 bg-slate-900/60 text-slate-400"
              )}
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
                <span className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-[11px]",
                  isActive
                    ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                    : isCompleted
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                    : "border-slate-700 bg-slate-900 text-slate-500"
                )}>
                  {index + 1}
                </span>
                {step.title}
              </div>
              {step.description && (
                <p className="mt-2 text-xs text-slate-400">{step.description}</p>
              )}
            </div>
          );
        })}
      </div>
      <div className="h-1 w-full rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
