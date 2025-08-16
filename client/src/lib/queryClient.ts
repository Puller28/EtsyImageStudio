import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get auth token from localStorage with FORCED production debugging
function getAuthToken(): string | null {
  try {
    // EMERGENCY PRODUCTION FIX: Force token retrieval with all possible methods
    let authStorage = localStorage.getItem('auth-storage');
    let authStorageBackup = localStorage.getItem('auth-storage-backup');
    let sessionAuth = sessionStorage.getItem('auth-storage');
    
    // Reduced debug logging for security
    if (import.meta.env.DEV) {
      console.log('🔍 Auth Debug:', { 
        hasStorage: !!authStorage,
        hasBackupStorage: !!authStorageBackup,
        hasSessionStorage: !!sessionAuth,
        environment: window.location.hostname
      });
    }
    
    // FORCE all storage locations to be checked
    if (!authStorage && authStorageBackup) {
      authStorage = authStorageBackup;
      if (import.meta.env.DEV) console.warn('🚨 Using backup storage for token');
    }
    if (!authStorage && sessionAuth) {
      authStorage = sessionAuth;  
      if (import.meta.env.DEV) console.warn('🚨 Using session storage for token');
    }
    
    // Try multiple storage sources for production compatibility
    const storageToTry = authStorage || authStorageBackup || sessionAuth;
    
    if (storageToTry) {
      const parsed = JSON.parse(storageToTry);
      const token = parsed.token || parsed.state?.token;
      if (import.meta.env.DEV) {
        console.log('🔍 Parsed Auth Data:', { 
          hasState: !!parsed.state,
          hasToken: !!token,
          hasUser: !!(parsed.user || parsed.state?.user),
          tokenPreview: token ? token.substring(0, 20) + '...' : 'null',
          tokenExpiry: token ? 'checking...' : 'no token'
        });
      }
      
      // Check if token is expired
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const isExpired = payload.exp * 1000 < Date.now();
          if (import.meta.env.DEV) {
            console.log('🔍 Token Status:', {
              expired: isExpired,
              expiresAt: new Date(payload.exp * 1000).toISOString(),
              userId: payload.userId
            });
          }
          
          if (isExpired) {
            if (import.meta.env.DEV) {
              console.warn('🔍 Token is expired, clearing authentication');
            }
            localStorage.removeItem('auth-storage');
            localStorage.removeItem('auth-storage-backup');
            sessionStorage.clear();
            // Force re-authentication for production
            if (window.location.hostname.includes('replit.dev')) {
              if (import.meta.env.DEV) {
                console.log('🔄 Production environment detected, forcing re-authentication');
              }
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
  
  // Add Authorization header if token exists - FORCE INCLUSION FOR PRODUCTION
  if (token) {
    (headers as any).Authorization = `Bearer ${token}`;
  }
  
  // Enhanced API request logging for debugging
  if (import.meta.env.DEV) {
    console.log('🔍 API Request Debug:', {
      method,
      url,
      hasToken: !!token,
      hasAuthHeader: !!((headers as any).Authorization),
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
      data: data ? JSON.stringify(data).substring(0, 100) + '...' : 'none'
    });
  }

  // Final verification before sending request
  const finalHeaders = { ...headers };
  if (token && !finalHeaders.Authorization) {
    (finalHeaders as any).Authorization = `Bearer ${token}`;
    console.warn('🔍 EMERGENCY: Re-added missing Authorization header');
  }

  // Only include body for methods that support it
  const fetchOptions: RequestInit = {
    method,
    headers: finalHeaders,
    credentials: "include",
  };

  // Don't add body for GET/HEAD requests
  if (method !== "GET" && method !== "HEAD" && data) {
    fetchOptions.body = JSON.stringify(data);
  }

  const res = await fetch(url, fetchOptions);

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
