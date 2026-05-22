<script>
  import { onMount } from "svelte";
  import { HakoImage } from "../utils/images.ts";
  import Button from "../components/common/Button.svelte";

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

<div
  id="landing-view"
  class="bg-hero min-h-screen flex flex-col px-6 py-8 md:py-12"
  class:loaded
  style="--hero-bg: url('{heroUrl}')"
>
  <!-- Center content area -->
  <div class="grow flex flex-col items-center justify-center text-center">
    <main class="max-w-4xl mx-auto">
      <h1
        class="text-6xl md:text-8xl font-extrabold mb-6 tracking-tighter flex items-center justify-center gap-4 md:gap-6"
      >
        <span class="font-['Zen_Antique'] text-(--hako-accent)">箱</span>
        <span class="font-['Zen_Antique'] text-(--hako-fg)">Hako</span>
      </h1>
      <p
        class="text-lg md:text-xl text-(--c7) mb-10 max-w-lg mx-auto leading-relaxed"
      >
        A box of everything Japanese media.
      </p>
      <div
        class="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6"
      >
        <Button variant="secondary" onclick={showLogin}>Login</Button>
        <Button variant="primary" onclick={showSignup}>Sign Up</Button>
      </div>
    </main>
  </div>

  <!-- Footer fixed at bottom with consistent padding -->
  <footer class="mt-auto pt-12 text-center pb-8">
    <p
      class="text-[10px] uppercase text-(--c7) opacity-60 leading-loose mx-auto tracking-widest px-4"
    >
      An in-development database, tracking platform, and indie social media for
      anime, manga, light novels, and visual novels.
    </p>
  </footer>
</div>

<style>
  .bg-hero {
    background: linear-gradient(rgba(26, 27, 38, 0.6), rgba(11, 16, 22, 1)),
      var(--hero-bg, --hako-bg);
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
    height: 100vh;
    display: flex;
    flex-direction: column;
    opacity: 0;
    transition: opacity 1.5s ease-in-out;
    will-change: opacity;
    transform: translateZ(0);
  }

  .bg-hero.loaded {
    opacity: 1;
  }
</style>
