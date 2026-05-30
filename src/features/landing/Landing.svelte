<script>
  import { onMount } from "svelte";
  import { HakoImage } from "../../shared/utils/images";
  import Button from "../../shared/components/Button.svelte";
  import RoadmapTimeline from "./components/RoadmapTimeline.svelte";

  let loaded = false;
  let heroUrl = "";

  onMount(() => {
    heroUrl = HakoImage.get("landing.jpg", { f: "avif" });
    const img = new Image();
    img.src = heroUrl;
    img.onload = () => {
      loaded = true;
    };
  });

  function showLogin() {
    window.dispatchEvent(new CustomEvent("show-login"));
  }

  function showSignup() {
    window.dispatchEvent(new CustomEvent("show-signup"));
  }
</script>

<div id="landing-view" class="min-h-screen flex flex-col relative" class:loaded>
  <!-- Fixed Background Layer -->
  <div
    class="fixed inset-0 -z-10 bg-hero"
    style="--hero-bg: url('{heroUrl}')"
  ></div>

  <!-- Hero Section -->
  <section
    class="min-h-screen flex flex-col justify-center items-center px-6 py-8 md:py-12"
  >
    <main class="grow flex flex-col justify-center items-center px-6">
      <div class="max-w-4xl mx-auto text-center">
        <h1
          class="text-6xl md:text-8xl font-extrabold mb-6 tracking-tighter flex items-center justify-center gap-4 md:gap-6"
        >
          <span class="text-(--hako-accent)">箱</span>
          <span class="text-(--hako-fg)">Hako</span>
        </h1>
        <p
          class="text-lg md:text-xl text-(--hako-fg) mb-10 max-w-lg mx-auto leading-relaxed"
        >
          A box of everything Japanese media.
        </p>
        <div
          class="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6"
        >
          <Button variant="secondary" onclick={showLogin}>Login</Button>
          <Button variant="primary" onclick={showSignup}>Sign Up</Button>
        </div>
      </div>
    </main>
    <div class="text-center pb-8 px-6">
      <p
        class="text-[10px] uppercase text-(--c7) opacity-60 leading-loose mx-auto tracking-widest"
      >
        An in-development database, tracking platform, and indie social media
        for anime, manga, light novels, and visual novels.
      </p>
    </div>
  </section>

  <!-- Roadmap Section -->
  <section
    class="bg-(--hako-bg)/90 py-24 px-6 border-t border-(--surface-elevated)"
  >
    <div class="max-w-4xl mx-auto">
      <h2 class="text-3xl font-bold text-(--hako-fg) text-center mb-12">
        Roadmap
      </h2>
      <RoadmapTimeline />
    </div>
  </section>

  <!-- Footer -->
  <footer class="mt-auto pt-12 text-center pb-8 bg-(--hako-bg)/90"></footer>
</div>

<style>
  .bg-hero {
    background: linear-gradient(rgba(26, 27, 38, 0.6), rgba(11, 16, 22, 1)),
      var(--hero-bg, --hako-bg);
    background-size: cover;
    background-position: center;
    /* Fixed via fixed position on container, not attachment */
    opacity: 0;
    transition: opacity 1.5s ease-in-out;
  }

  .loaded .bg-hero {
    opacity: 1;
  }
</style>
