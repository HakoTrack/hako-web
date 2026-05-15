export const renderLoginPage = () => {
  return `
    <div class="flex flex-col items-center justify-center min-h-[60vh]">
        <form id="login-form" class="bg-card p-8 rounded-lg shadow-xl w-full max-w-md border border-accent/20">
            <h2 class="text-2xl font-bold mb-6 text-accent">Welcome Back</h2>
            <input type="email" id="email" placeholder="Email" class="w-full p-3 mb-4 bg-[#0b1622] border border-slate-700 rounded focus:border-accent outline-none text-white">
            <input type="password" id="password" placeholder="Password" class="w-full p-3 mb-6 bg-[#0b1622] border border-slate-700 rounded focus:border-accent outline-none text-white">
            <button type="submit" class="w-full bg-accent text-white py-3 rounded font-bold hover:opacity-90 transition-opacity">
                Sign In
            </button>
            <p class="mt-4 text-sm text-slate-400">Don't have an account? <a href="/signup" class="text-accent">Join Hako</a></p>
        </form>
    </div>
    `;
};
