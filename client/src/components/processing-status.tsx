import { CheckCircle, Clock, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProcessingStep {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed" | "failed";
}

interface ProcessingStatusProps {
  steps: ProcessingStep[];
  progress: number;
}

export default function ProcessingStatus({ steps, progress }: ProcessingStatusProps) {
  const getIcon = (status: ProcessingStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />;
      case "failed":
        return <Clock className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTextColor = (status: ProcessingStep["status"]) => {
    switch (status) {
      case "completed":
        return "text-gray-900";
      case "processing":
        return "text-gray-900";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          <Loader2 className="inline w-5 h-5 text-primary mr-2" />
          Processing Status
        </h3>
        
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center">
              {getIcon(step.status)}
              <span className={`text-sm ml-3 ${getTextColor(step.status)}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>
    </div>
  );
}
