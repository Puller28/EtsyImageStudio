import { Check, Clock, Cog } from "lucide-react";

interface WorkflowProgressProps {
  currentStep: number;
  hasActiveProject?: boolean;
}

export default function WorkflowProgress({ currentStep, hasActiveProject = false }: WorkflowProgressProps) {
  const steps = [
    { label: "Upload", icon: Check },
    { label: "Processing", icon: Cog },
    { label: "Generate", icon: Clock },
    { label: "Download", icon: Check },
  ];

  // Ensure currentStep doesn't exceed the number of steps
  const safeCurrentStep = Math.min(currentStep, steps.length);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Processing Workflow</h2>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => {
            const isCompleted = index < safeCurrentStep;
            const isCurrent = index === safeCurrentStep;
            const isPending = index > safeCurrentStep;

            return (
              <div key={index} className="flex items-center">
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isCurrent
                        ? "bg-orange-500 text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : isCurrent && hasActiveProject ? (
                      <Cog className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-900">{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 rounded-full mx-4 ${
                      isCompleted ? "bg-green-500" : "bg-gray-200"
                    }`}
                    style={{ width: "60px" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
