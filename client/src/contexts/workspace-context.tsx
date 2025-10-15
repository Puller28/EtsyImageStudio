import { createContext, useContext, useState, useMemo, ReactNode } from "react";
import type { WorkspaceMode } from "@/types/workspace";

interface WorkspaceContextState {
  mode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextState | undefined>(undefined);

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [mode, setMode] = useState<WorkspaceMode>("tools");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      selectedProjectId,
      setSelectedProjectId,
    }),
    [mode, selectedProjectId]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
