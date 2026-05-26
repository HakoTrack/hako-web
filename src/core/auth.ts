import { supabase } from './supabase.js';
import type { User } from '@supabase/supabase-js';

export const AuthService = {
  // Check if a user is currently logged in
  async getCurrentUser(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
  },

  // Sign out logic
  async logout(): Promise<void> {
    await supabase.auth.signOut();
    window.location.reload(); // Refresh to trigger the router
  }
};

export const initAuth = (): void => {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
  });
};
