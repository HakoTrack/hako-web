<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import Cropper from "cropperjs";
  import "cropperjs/dist/cropper.css";
  import Button from "../../shared/components/Button.svelte";

  interface Props {
    imageSrc: string;
    aspectRatio: number;
    onCrop: (file: File) => void;
    onCancel: () => void;
  }

  let { imageSrc, aspectRatio, onCrop, onCancel }: Props = $props();
  let imageElement: HTMLImageElement;
  let containerElement: HTMLDivElement;
  let cropper: Cropper | null = null;
  let resizeObserver: ResizeObserver | null = null;

  onMount(() => {
    // Use ResizeObserver to detect when the container has a size
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          if (!cropper) {
            console.log("Container ready, initializing Cropper");
            initCropper();
          }
        }
      }
    });

    if (containerElement) {
      resizeObserver.observe(containerElement);
    }
  });

  function initCropper() {
    cropper = new Cropper(imageElement, {
      aspectRatio,
      viewMode: 1,
      dragMode: "move",
      guides: true,
      center: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
    });
  }

  onDestroy(() => {
    if (cropper) cropper.destroy();
    if (resizeObserver) resizeObserver.disconnect();
  });

  function handleConfirm() {
    if (!cropper) return;
    cropper.getCroppedCanvas().toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "cropped.webp", { type: "image/webp" });
          onCrop(file);
        }
      },
      "image/webp",
      1,
    ); // 1 = maximum quality
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
>
  <div
    class="bg-card rounded-2xl flex flex-col overflow-hidden w-full max-w-2xl"
  >
    <div
      bind:this={containerElement}
      class="relative w-full h-[60vh] flex items-center justify-center bg-black/20"
    >
      <img
        bind:this={imageElement}
        src={imageSrc}
        alt="Crop"
        class="max-w-full max-h-full block"
      />
    </div>
    <div
      class="flex justify-end gap-3 p-4 border-t border-(--surface-elevated)"
    >
      <Button variant="secondary" onclick={onCancel}>Cancel</Button>
      <Button onclick={handleConfirm}>Crop & Upload</Button>
    </div>
  </div>
</div>

<style>
  :global(.cropper-container) {
    display: block !important;
    width: 100% !important;
    height: 100% !important;
  }
</style>
