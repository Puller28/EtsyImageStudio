export interface ProcessingStep {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed" | "failed";
  icon: string;
}

export interface MockupTemplate {
  id: string;
  name: string;
  imageUrl: string;
}

export interface EtsyListing {
  title: string;
  tags: string[];
  description: string;
}

export interface ProjectStatus {
  currentStep: number;
  steps: ProcessingStep[];
  progress: number;
}
