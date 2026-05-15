import { supabase } from '../utils/supabase.js';

export const AuthService = {
  // Check if a user is currently logged in
  async getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
  },

  // Sign out logic
  async logout() {
    await supabase.auth.signOut();
    window.location.reload(); // Refresh to trigger the router
  }
};
