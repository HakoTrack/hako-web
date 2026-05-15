// router.js (Simplified Logic)
export const handleRouting = async () => {
  const session = await getSupabaseSession();
  const path = window.location.pathname;

  if (!session && path === '/') {
    renderModule('landing');
  } else if (path === '/feed') {
    renderModule('feed');
  } else if (path.startsWith('/profile')) {
    renderModule('profile');
  }
};
