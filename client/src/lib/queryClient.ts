import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get auth token from localStorage with enhanced production debugging
function getAuthToken(): string | null {
  try {
    // Check all possible storage locations for production compatibility
    const authStorage = localStorage.getItem('auth-storage');
    const authStorageBackup = localStorage.getItem('auth-storage-backup');
    const sessionAuth = sessionStorage.getItem('auth-storage');
    
    console.log('🔍 Enhanced Auth Storage Debug:', { 
      hasStorage: !!authStorage,
      hasBackupStorage: !!authStorageBackup,
      hasSessionStorage: !!sessionAuth,
      storagePreview: authStorage ? authStorage.substring(0, 100) + '...' : 'null',
      allStorageKeys: Object.keys(localStorage).filter(key => key.includes('auth')),
      environment: window.location.hostname
    });
    
    // Try multiple storage sources for production compatibility
    const storageToTry = authStorage || authStorageBackup || sessionAuth;
    
    if (storageToTry) {
      const parsed = JSON.parse(storageToTry);
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
            localStorage.removeItem('auth-storage-backup');
            sessionStorage.clear();
            // Force re-authentication for production
            if (window.location.hostname.includes('replit.dev')) {
              console.log('🔄 Production environment detected, forcing re-authentication');
              window.location.reload();
            }
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
  
  // Add Authorization header if token exists
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  console.log('🔍 API Request Debug:', {
    method,
    url,
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
    hasAuthHeader: !!headers.Authorization
  });

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
      
      // Show user-friendly notification
      const message = 'Your session has expired. Please refresh the page and log in again to continue.';
      
      // Create temporary notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #ef4444; color: white; padding: 12px 16px;
        border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: system-ui, sans-serif; font-size: 14px; max-width: 300px;
      `;
      notification.textContent = message;
      document.body.appendChild(notification);
      
      // Try to refresh authentication automatically for production
      const currentUser = getCurrentUserFromStorage();
      if (currentUser?.id && url.includes('/api/')) {
        // Attempt automatic token refresh for production
        fetch('/api/refresh-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.token) {
            console.log('🔄 Successfully refreshed authentication token');
            // Update localStorage with fresh token
            const authData = {
              state: {
                user: data.user,
                token: data.token
              }
            };
            localStorage.setItem('auth-storage', JSON.stringify(authData));
            
            // Remove notification and reload page
            document.body.removeChild(notification);
            window.location.reload();
          } else {
            // Fallback to manual refresh
            setTimeout(() => window.location.reload(), 3000);
          }
        })
        .catch(() => {
          // Fallback to manual refresh
          setTimeout(() => window.location.reload(), 3000);
        });
      } else {
        // Auto-reload after showing message
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    }
  }

  await throwIfResNotOk(res);
  return res;
}

// Helper function to get current user from storage
function getCurrentUserFromStorage() {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed.user || parsed.state?.user || null;
    }
  } catch (error) {
    console.error('Error getting current user:', error);
  }
  return null;
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
