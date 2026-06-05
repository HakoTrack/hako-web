import { parse_markdown_wasm } from "$wasm/hako_wasm";

export type MarkdownPart =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'bold-italic'; content: string }
  | { type: 'link'; content: string; url: string }
  | { type: 'image'; alt: string; url: string };

/**
 * Renders Markdown text to HTML using the Rust WASM engine.
 */
export function parseMarkdown(text: string): string {
  return parse_markdown_wasm(text);
}

/**
 * Calculates the character count of visible text, ignoring Markdown syntax.
 */
export function getVisibleCharacterCount(text: string): number {
  return text
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1') // images -> alt text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')   // links -> link text
    .replace(/(\*\*\*|\*\*|\*)/g, '')            // bold/italic
    .trim()
    .length;
}
