/**
 * Global auth and route state management.
 */

const Auth = {
  SESSION_KEY: 'anitrack_session',

  /**
   * Detects username from URL.
   * 1. Checks query param (?user=...)
   * 2. Checks path segment (/profile/username)
   * 3. Falls back to logged-in user
   */
  getViewingUser: () => {
    const url = new URL(window.location.href);

    // Check Query Parameter
    const urlUser = url.searchParams.get('user');
    if (urlUser) return urlUser;

    // Check Path Segment (e.g., /profile/shaetsu)
    // Splits path and looks for segment following 'profile'
    const pathSegments = url.pathname.split('/');
    const profileIndex = pathSegments.indexOf('profile');
    if (profileIndex !== -1 && pathSegments[profileIndex + 1]) {
      return pathSegments[profileIndex + 1].replace('.html', '');
    }

    return Auth.getLoggedInUser();
  },

  getLoggedInUser: () => {
    const session = localStorage.getItem(Auth.SESSION_KEY);
    if (session) {
      try {
        return JSON.parse(session).username;
      } catch (e) {
        return "shaetsu";
      }
    }
    return "shaetsu";
  },

  setSession: (username) => {
    localStorage.setItem(Auth.SESSION_KEY, JSON.stringify({
      username,
      loginTime: Date.now()
    }));
  }
};

window.Auth = Auth;
