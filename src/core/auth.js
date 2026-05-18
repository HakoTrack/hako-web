import { supabase } from '../utils/supabase.js';

export const AuthService = {
  // Check if a user is currently logged in
  async getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
  },

  async getProfileByUsername(username) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, animeList:profile_list(*)')
      .eq('username', username)
      .single();
    if (error) return null;
    return data;
  },

  async getProfileById(id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  // Sign out logic
  async logout() {
    await supabase.auth.signOut();
    window.location.reload(); // Refresh to trigger the router
  }
};

export const initAuth = () => {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
    // You could trigger a re-route here if needed
  });
};
