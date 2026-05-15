export const renderSignupPage = () => {
  return `
    <div class="flex flex-col items-center justify-center min-h-[60vh]">
        <div class="bg-card p-8 rounded-lg shadow-xl w-full max-w-md border border-slate-700 text-center">
            <h2 class="text-2xl font-bold mb-4 text-slate-400">Registration Closed</h2>
            <p class="text-slate-500 mb-6">We are currently in a closed beta phase. Please check back later.</p>
            <p class="text-sm text-slate-400">Already have an account? <a href="/login" class="text-accent">Sign In</a></p>
        </div>

        <!-- Registration Form (Hidden for closed beta) -->
        <!--
        <form id="signup-form" class="hidden bg-card p-8 rounded-lg shadow-xl w-full max-w-md border border-accent/20">
            <h2 class="text-2xl font-bold mb-6 text-accent">Join Hako</h2>
            <input type="email" id="email" placeholder="Email" class="w-full p-3 mb-4 bg-[#0b1622] border border-slate-700 rounded focus:border-accent outline-none text-white">
            <input type="password" id="password" placeholder="Password" class="w-full p-3 mb-4 bg-[#0b1622] border border-slate-700 rounded focus:border-accent outline-none text-white">
            <input type="password" id="confirm-password" placeholder="Confirm Password" class="w-full p-3 mb-6 bg-[#0b1622] border border-slate-700 rounded focus:border-accent outline-none text-white">
            <button type="submit" class="w-full bg-accent text-white py-3 rounded font-bold hover:opacity-90 transition-opacity">
                Create Account
            </button>
            <p class="mt-4 text-sm text-slate-400">Already have an account? <a href="/login" class="text-accent">Sign In</a></p>
        </form>
        -->
    </div>
    `;
};
