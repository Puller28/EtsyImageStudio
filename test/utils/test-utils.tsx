import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { WorkspaceProvider } from '@/contexts/workspace-context';
import { Toaster } from '@/components/ui/toaster';

// Create a custom render function that includes providers
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface AllTheProvidersProps {
  children: React.ReactNode;
  initialRoute?: string;
}

function AllTheProviders({ children, initialRoute = '/' }: AllTheProvidersProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <Router base={initialRoute}>
        <WorkspaceProvider>
          {children}
          <Toaster />
        </WorkspaceProvider>
      </Router>
    </QueryClientProvider>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { initialRoute, ...renderOptions } = options || {};
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders initialRoute={initialRoute}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
export { createTestQueryClient };
