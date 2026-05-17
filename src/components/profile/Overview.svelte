<script>
  let { profileData } = $props();
</script>

<div class="bg-card p-6 rounded-xl shadow-md">
  <h3 class="text-white font-bold flex items-center mb-4">
    <i class="fa-solid fa-user text-accent mr-2"></i> Overview
  </h3>
  <p class="text-slate-400">
    {profileData?.about_me || "No description provided."}
  </p>
</div>
