/// <reference types="vite/client" />

declare module "highlightjs-svelte/dist/index.mjs" {
  import type HLJS from "highlight.js";
  const plugin: (hljs: typeof HLJS) => void;
  export default plugin;
}
