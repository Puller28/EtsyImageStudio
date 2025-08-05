import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get auth token from localStorage
function getAuthToken(): string | null {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    console.log('🔍 Auth Storage Debug:', { 
      hasStorage: !!authStorage,
      storagePreview: authStorage ? authStorage.substring(0, 100) + '...' : 'null'
    });
    
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      const token = parsed.token || parsed.state?.token;
      console.log('🔍 Parsed Auth Data:', { 
        hasState: !!parsed.state,
        hasToken: !!token,
        hasUser: !!(parsed.user || parsed.state?.user),
        tokenPreview: token ? token.substring(0, 20) + '...' : 'null',
        tokenExpiry: token ? 'checking...' : 'no token'
      });
      
      // Check if token is expired
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const isExpired = payload.exp * 1000 < Date.now();
          console.log('🔍 Token Status:', {
            expired: isExpired,
            expiresAt: new Date(payload.exp * 1000).toISOString(),
            userId: payload.userId
          });
          
          if (isExpired) {
            console.warn('🔍 Token is expired, clearing authentication');
            localStorage.removeItem('auth-storage');
            // Clear all auth-related storage to force fresh authentication
            sessionStorage.clear();
            // Trigger a page reload to clear the auth state
            setTimeout(() => window.location.reload(), 100);
            return null;
          }
        } catch (error) {
          console.error('🔍 Token decode error:', error);
          return null;
        }
      }
      
      // Handle both direct storage and nested state structure
      return token;
    }
  } catch (error) {
    console.error('🔍 Auth Storage Parse Error:', error);
  }
  return null;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = getAuthToken();
  const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
  
  console.log('🔍 API Request Debug:', {
    method,
    url,
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'null',
    willSendAuthHeader: !!token
  });
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    console.error('🔍 API Request Failed:', {
      status: res.status,
      statusText: res.statusText,
      url,
      hadToken: !!token
    });
    
    // Handle authentication failures (invalid/expired tokens)
    if (res.status === 401 || res.status === 403) {
      console.warn('🔍 Authentication failed, clearing invalid token');
      localStorage.removeItem('auth-storage');
      sessionStorage.clear();
      // For critical endpoints like subscribe, force page reload
      if (url.includes('/api/subscribe') || url.includes('/api/purchase')) {
        setTimeout(() => {
          alert('Your session has expired. Please log in again to continue with your purchase.');
          window.location.reload();
        }, 100);
      }
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = getAuthToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
