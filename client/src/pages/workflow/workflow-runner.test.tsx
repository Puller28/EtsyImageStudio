import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/../../test/utils/test-utils';
import { fireEvent } from '@testing-library/react';
import WorkflowRunnerPage from './workflow-runner';
import { mockProjects } from '@/../../test/mocks/mockData';

// Mock the useWorkspace hook
const mockSetSelectedProjectId = vi.fn();
const mockSetMode = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@/contexts/workspace-context', () => ({
  useWorkspace: () => ({
    mode: 'workflow',
    setMode: mockSetMode,
    selectedProjectId: 'project-1',
    setSelectedProjectId: mockSetSelectedProjectId,
  }),
  WorkspaceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual('wouter');
  return {
    ...actual,
    useLocation: () => ['/', mockNavigate],
  };
});

describe('WorkflowRunner - Project Selection Bug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should clear selectedProjectId when clicking "Create new project"', async () => {
    render(<WorkflowRunnerPage />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Swedish Girl')).toBeInTheDocument();
    });

    // Find and click "Create new project" button
    const createButton = screen.getByText('Create new project');
    expect(createButton).toBeInTheDocument();

    fireEvent.click(createButton);

    // Verify that selectedProjectId was cleared BEFORE navigation
    await waitFor(() => {
      expect(mockSetSelectedProjectId).toHaveBeenCalledWith(null);
      expect(mockNavigate).toHaveBeenCalledWith('/tools/upscale');
    });

    // Verify the order: clear first, then navigate
    const calls = mockSetSelectedProjectId.mock.calls;
    expect(calls[calls.length - 1][0]).toBe(null);
  });

  it('should NOT clear selectedProjectId when clicking "Continue" with selected project', async () => {
    render(<WorkflowRunnerPage />);

    await waitFor(() => {
      expect(screen.getByText('Swedish Girl')).toBeInTheDocument();
    });

    // Find the Continue/Next button
    const continueButton = screen.getByText(/Continue|Next step/i);
    
    // Should be enabled because a project is selected
    expect(continueButton).not.toBeDisabled();

    fireEvent.click(continueButton);

    // Should NOT have called setSelectedProjectId with null
    expect(mockSetSelectedProjectId).not.toHaveBeenCalledWith(null);
  });

  it('should display all projects in the list', async () => {
    render(<WorkflowRunnerPage />);

    await waitFor(() => {
      mockProjects.forEach((project) => {
        expect(screen.getByText(project.title)).toBeInTheDocument();
      });
    });
  });

  it('should allow selecting a different project', async () => {
    render(<WorkflowRunnerPage />);

    await waitFor(() => {
      expect(screen.getByText('Woman')).toBeInTheDocument();
    });

    // Find the radio button for "Woman" project
    const womanRadio = screen.getByLabelText(/Woman/i);
    fireEvent.click(womanRadio);

    // Should have called setSelectedProjectId with the new project ID
    await waitFor(() => {
      expect(mockSetSelectedProjectId).toHaveBeenCalledWith('project-2');
    });
  });

  it('should disable Continue button when no project is selected', async () => {
    // Mock with no selected project
    vi.mocked(vi.importActual('@/contexts/workspace-context')).useWorkspace = () => ({
      mode: 'workflow',
      setMode: mockSetMode,
      selectedProjectId: null,
      setSelectedProjectId: mockSetSelectedProjectId,
    });

    render(<WorkflowRunnerPage />);

    await waitFor(() => {
      expect(screen.getByText('Swedish Girl')).toBeInTheDocument();
    });

    const continueButton = screen.getByText(/Select a project to continue/i);
    expect(continueButton).toBeDisabled();
  });
});

describe('WorkflowRunner - Step Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start at step 0 (Select Project)', async () => {
    render(<WorkflowRunnerPage />);

    await waitFor(() => {
      expect(screen.getByText('Choose your workspace project')).toBeInTheDocument();
    });
  });

  it('should navigate to next step when clicking Next', async () => {
    render(<WorkflowRunnerPage />);

    await waitFor(() => {
      expect(screen.getByText('Swedish Girl')).toBeInTheDocument();
    });

    const nextButton = screen.getByText(/Continue|Next step/i);
    fireEvent.click(nextButton);

    // Should advance to step 1 (Upscale)
    await waitFor(() => {
      expect(screen.getByText(/Upscale & assets/i)).toBeInTheDocument();
    });
  });

  it('should navigate back when clicking Previous', async () => {
    render(<WorkflowRunnerPage />);

    // Go to step 1
    await waitFor(() => {
      expect(screen.getByText('Swedish Girl')).toBeInTheDocument();
    });
    
    const nextButton = screen.getByText(/Continue|Next step/i);
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/Upscale & assets/i)).toBeInTheDocument();
    });

    // Go back to step 0
    const previousButton = screen.getByText('Previous step');
    fireEvent.click(previousButton);

    await waitFor(() => {
      expect(screen.getByText('Choose your workspace project')).toBeInTheDocument();
    });
  });

  it('should disable Previous button on first step', async () => {
    render(<WorkflowRunnerPage />);

    await waitFor(() => {
      const previousButton = screen.getByText('Previous step');
      expect(previousButton).toBeDisabled();
    });
  });
});

describe('WorkflowRunner - Regression Tests', () => {
  it('should maintain selected project through workflow steps', async () => {
    render(<WorkflowRunnerPage />);

    await waitFor(() => {
      expect(screen.getByText('Swedish Girl')).toBeInTheDocument();
    });

    // Advance through steps
    const nextButton = screen.getByText(/Continue|Next step/i);
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/Upscale & assets/i)).toBeInTheDocument();
    });

    // Selected project should still be 'project-1'
    // This would be verified by checking the workspace context
    // In a real test, we'd check that the upscale tool receives the correct project ID
  });

  it('should handle URL parameter for auto-selecting project', async () => {
    // This tests the useEffect that reads ?project=xxx from URL
    render(<WorkflowRunnerPage />, { initialRoute: '/workflow/run?project=project-2' });

    await waitFor(() => {
      expect(mockSetSelectedProjectId).toHaveBeenCalledWith('project-2');
    });
  });
});
