import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  credits: number;
  avatar?: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  subscriptionId?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: (user: User, token: string) => {
        console.log('🔐 Auth login called with:', { userId: user.id, token: token.substring(0, 20) + '...' });
        
        // Store authentication data with backup for production compatibility
        const authData = { user, token, isAuthenticated: true };
        set(authData);
        
        // Create backup storage for production environment
        try {
          localStorage.setItem('auth-storage-backup', JSON.stringify({
            state: authData
          }));
          console.log('✅ Auth state updated with backup storage');
        } catch (error) {
          console.warn('Failed to create backup storage:', error);
        }
        
        console.log('✅ Auth state updated successfully');
      },
      
      logout: () => {
        console.log('🔐 Logging out user');
        localStorage.removeItem('auth-storage');
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false 
        });
      },
      
      updateUser: (updatedUser: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ 
            user: { ...currentUser, ...updatedUser } 
          });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);