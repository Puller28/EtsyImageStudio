import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get auth token from localStorage with robust error handling
function getAuthToken(): string | null {
  try {
    // Primary storage location
    const authStorage = localStorage.getItem('auth-storage');
    
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      const token = parsed.token || parsed.state?.token;
      
      // Validate token format (JWT should have 3 parts separated by dots)
      if (token && typeof token === 'string' && token.split('.').length === 3) {
        try {
          // Check if token is expired
          const tokenParts = token.split('.');
          const payload = JSON.parse(atob(tokenParts[1]));
          const isExpired = payload.exp * 1000 < Date.now();
          
          if (isExpired) {
            console.warn('🔍 Token expired, clearing storage');
            clearAllAuthStorage();
            return null;
          }
          
          return token;
        } catch (decodeError) {
          console.error('🔍 Token decode error, clearing corrupted token:', decodeError);
          clearAllAuthStorage();
          return null;
        }
      } else {
        console.error('🔍 Invalid token format, clearing corrupted data');
        clearAllAuthStorage();
        return null;
      }
    }
  } catch (error) {
    console.error('🔍 Auth storage parse error, clearing corrupted data:', error);
    clearAllAuthStorage();
  }
  
  return null;
}

// Helper function to clear all authentication storage
function clearAllAuthStorage() {
  localStorage.removeItem('auth-storage');
  localStorage.removeItem('auth-storage-backup');
  localStorage.removeItem('auth-storage-backup-production');
  sessionStorage.removeItem('auth-storage');
  
  // Clear any other potential corrupted auth keys
  Object.keys(localStorage).forEach(key => {
    if (key.includes('auth') && key !== 'auth-storage') {
      localStorage.removeItem(key);
    }
  });
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

  // Only include body for methods that support it
  const fetchOptions: RequestInit = {
    method,
    headers,
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
      clearAllAuthStorage();
      
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
        .catch((error) => {
          console.error('Token refresh failed:', error);
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
    clearAllAuthStorage();
  }
  return null;
}

// Utility to clear corrupted tokens - call this if experiencing auth issues
export function clearCorruptedTokens() {
  console.log('📴 Clearing all potentially corrupted authentication data');
  clearAllAuthStorage();
  console.log('✅ Authentication storage cleared - please log in again');
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
