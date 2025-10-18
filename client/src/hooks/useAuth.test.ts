import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useAuth Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with no user', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should login user and store token', () => {
    const { result } = renderHook(() => useAuth());

    const mockUser = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      credits: 100,
    };
    const mockToken = 'mock-jwt-token';

    act(() => {
      result.current.login(mockUser, mockToken);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe(mockToken);
    expect(result.current.isAuthenticated).toBe(true);

    // Verify localStorage was updated
    const stored = localStorage.getItem('auth-storage');
    expect(stored).toBeTruthy();
    
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.state.user).toEqual(mockUser);
      expect(parsed.state.token).toBe(mockToken);
    }
  });

  it('should create backup storage on login', () => {
    const { result } = renderHook(() => useAuth());

    const mockUser = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      credits: 100,
    };

    act(() => {
      result.current.login(mockUser, 'mock-token');
    });

    // Verify backup storage was created
    const backup = localStorage.getItem('auth-storage-backup');
    expect(backup).toBeTruthy();
  });

  it('should logout user and clear all storage', () => {
    const { result } = renderHook(() => useAuth());

    // First login
    act(() => {
      result.current.login(
        { id: 'user-1', name: 'Test', email: 'test@example.com', credits: 100 },
        'mock-token'
      );
    });

    expect(result.current.isAuthenticated).toBe(true);

    // Mock window.location.href
    delete (window as any).location;
    (window as any).location = { href: '' };

    // Then logout
    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);

    // Verify all storage was cleared
    expect(localStorage.getItem('auth-storage')).toBeNull();
    expect(localStorage.getItem('auth-storage-backup')).toBeNull();
  });

  it('should update user information', () => {
    const { result } = renderHook(() => useAuth());

    // Login first
    act(() => {
      result.current.login(
        { id: 'user-1', name: 'Test', email: 'test@example.com', credits: 100 },
        'mock-token'
      );
    });

    // Update user
    act(() => {
      result.current.updateUser({ credits: 150, name: 'Updated Name' });
    });

    expect(result.current.user?.credits).toBe(150);
    expect(result.current.user?.name).toBe('Updated Name');
    expect(result.current.user?.email).toBe('test@example.com'); // Unchanged
  });

  it('should not update user if not logged in', () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.updateUser({ credits: 150 });
    });

    expect(result.current.user).toBeNull();
  });

  it('should persist auth state across hook instances', () => {
    // First hook instance - login
    const { result: result1 } = renderHook(() => useAuth());

    act(() => {
      result1.current.login(
        { id: 'user-1', name: 'Test', email: 'test@example.com', credits: 100 },
        'mock-token'
      );
    });

    // Second hook instance - should have same state
    const { result: result2 } = renderHook(() => useAuth());

    expect(result2.current.user?.id).toBe('user-1');
    expect(result2.current.token).toBe('mock-token');
    expect(result2.current.isAuthenticated).toBe(true);
  });

  it('should handle token from Zustand store (not plain localStorage)', () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.login(
        { id: 'user-1', name: 'Test', email: 'test@example.com', credits: 100 },
        'mock-jwt-token'
      );
    });

    // Token should be accessible via the hook
    expect(result.current.token).toBe('mock-jwt-token');

    // Should NOT be in plain localStorage.getItem('token')
    expect(localStorage.getItem('token')).toBeNull();

    // Should be in Zustand's persisted storage
    const authStorage = localStorage.getItem('auth-storage');
    expect(authStorage).toBeTruthy();
    
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      expect(parsed.state.token).toBe('mock-jwt-token');
    }
  });
});

describe('useAuth - Edge Cases', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should handle corrupted localStorage gracefully', () => {
    // Set corrupted data
    localStorage.setItem('auth-storage', 'invalid-json{{{');

    const { result } = renderHook(() => useAuth());

    // Should initialize with default state
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should handle missing user data in storage', () => {
    // Set incomplete data
    localStorage.setItem('auth-storage', JSON.stringify({ state: { token: 'token-only' } }));

    const { result } = renderHook(() => useAuth());

    // Should handle gracefully
    expect(result.current.token).toBeTruthy();
    expect(result.current.user).toBeFalsy();
  });

  it('should clear corrupted auth keys on logout', () => {
    // Set various auth-related keys
    localStorage.setItem('auth-storage', 'data');
    localStorage.setItem('auth-storage-backup', 'data');
    localStorage.setItem('auth-corrupted-key', 'data');
    localStorage.setItem('other-key', 'data');

    const { result } = renderHook(() => useAuth());

    // Mock window.location
    delete (window as any).location;
    (window as any).location = { href: '' };

    act(() => {
      result.current.logout();
    });

    // Auth keys should be cleared
    expect(localStorage.getItem('auth-storage')).toBeNull();
    expect(localStorage.getItem('auth-storage-backup')).toBeNull();
    expect(localStorage.getItem('auth-corrupted-key')).toBeNull();

    // Other keys should remain
    expect(localStorage.getItem('other-key')).toBe('data');
  });
});
