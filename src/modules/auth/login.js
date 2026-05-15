export const renderLoginPage = () => {
  return `
    <div class="flex flex-col items-center justify-center min-h-[60vh]">
        <form id="login-form" class="bg-secondary-bg p-8 rounded-lg shadow-xl w-full max-w-md border border-accent-color/20">
            <h2 class="text-2xl font-bold mb-6 text-accent-color">Welcome Back</h2>
            <input type="email" id="email" placeholder="Email" class="w-full p-3 mb-4 bg-bg-color border border-gray-700 rounded focus:border-accent-color outline-none">
            <input type="password" id="password" placeholder="Password" class="w-full p-3 mb-6 bg-bg-color border border-gray-700 rounded focus:border-accent-color outline-none">
            <button type="submit" class="w-full bg-accent-color text-bg-color py-3 rounded font-bold hover:opacity-90 transition-opacity">
                Sign In
            </button>
            <p class="mt-4 text-sm text-gray-400">Don't have an account? <a href="/signup" class="text-accent-color">Join Hako</a></p>
        </form>
    </div>
    `;
};
