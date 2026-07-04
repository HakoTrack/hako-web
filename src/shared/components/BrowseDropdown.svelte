<script>
  import { onMount, onDestroy } from "svelte";
  import { computePosition, flip, shift, offset } from "@floating-ui/dom";

  const mediaTypes = [
    { id: "anime", label: "Anime", icon: "fa-tv" },
    { id: "manga", label: "Manga", icon: "fa-book fa-flip-horizontal" },
    { id: "light_novel", label: "Light Novels", icon: "fa-book-open" },
  ];

  const typeLinks = [
    { label: "Top 100", path: (t) => `/top/${t}` },
    { label: "Search", path: (t) => `/search/${t}` },
    { label: "Discover", path: (t) => `/discover/${t}` },
  ];

  const globalLinks = [
    { label: "Characters", path: "/characters", icon: "fa-user" },
    { label: "Staff", path: "/staff", icon: "fa-user-tie" },
    { label: "Companies", path: "/companies", icon: "fa-building" },
  ];

  let { children } = $props();

  let isOpen = $state(false);
  let triggerRef = $state(null);
  let dropdownRef = $state(null);

  function updatePosition() {
    if (isOpen && triggerRef && dropdownRef) {
      computePosition(triggerRef, dropdownRef, {
        middleware: [offset(12), flip(), shift()],
        strategy: "absolute",
      }).then(({ x, y }) => {
        Object.assign(dropdownRef.style, {
          left: `${x}px`,
          top: `${y}px`,
        });
      });
    }
  }

  function toggle(e) {
    e.stopPropagation();
    isOpen = !isOpen;
    if (isOpen) requestAnimationFrame(updatePosition);
  }

  function handleClickOutside(event) {
    if (
      isOpen &&
      dropdownRef &&
      !dropdownRef.contains(event.target) &&
      triggerRef &&
      !triggerRef.contains(event.target)
    ) {
      isOpen = false;
    }
  }

  function navigate(path) {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
    isOpen = false;
  }

  onMount(() => window.addEventListener("click", handleClickOutside));
  onDestroy(() => window.removeEventListener("click", handleClickOutside));
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div bind:this={triggerRef} class="relative inline-block" onclick={toggle}>
  {@render children?.()}

  {#if isOpen}
    <div
      bind:this={dropdownRef}
      class="absolute w-96 py-3 px-4 bg-(--surface) border border-(--c8) rounded-xl shadow-2xl z-100 animate-in fade-in zoom-in-95 duration-100"
      onclick={(e) => e.stopPropagation()}
    >
      {#each mediaTypes as mtype}
        <div class="flex items-center gap-4 py-2">
          <span class="text-sm font-semibold text-(--hako-fg) shrink-0 whitespace-nowrap w-28">
            <i class="fa-solid {mtype.icon} mr-2 w-4 text-center text-(--c8)"
            ></i>
            {mtype.label}
          </span>
          <span class="flex items-center gap-2">
            {#each typeLinks as link, i}
              {#if i > 0}
                <span class="text-(--c8) text-xs shrink-0">·</span>
              {/if}
              <button
                onclick={() => navigate(link.path(mtype.id))}
                class="text-xs text-(--c8) hover:text-(--hako-fg) transition-colors whitespace-nowrap"
              >
                {link.label}
              </button>
            {/each}
          </span>
        </div>
      {/each}

      <div class="border-t border-(--c8) my-2"></div>

      <div class="flex items-center gap-4 py-2">
        {#each globalLinks as link}
          <button
            onclick={() => navigate(link.path)}
            class="flex items-center gap-1.5 text-xs text-(--c8) hover:text-(--hako-fg) transition-colors whitespace-nowrap"
          >
            <i class="fa-solid {link.icon}"></i>
            {link.label}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
