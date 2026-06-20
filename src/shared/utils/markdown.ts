import { parse_markdown_wasm } from "$wasm/hako_wasm";

export type MarkdownPart =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'bold-italic'; content: string }
  | { type: 'link'; content: string; url: string }
  | { type: 'image'; alt: string; url: string };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildQuoteHtml(
  attrStr: string,
  innerContent: string,
  avatars: Record<string, string>,
  depth: number,
): string {
  const username = attrStr.split(",")[0]?.trim() || "User";
  const postMatch = attrStr.match(/post=(\d+)/);
  const postId = postMatch ? parseInt(postMatch[1]) : null;

  const avatar = avatars[username]
    ? `<img src="${escapeHtml(avatars[username])}" class="hako-quote-avatar" alt="">`
    : "";
  const name = `<span class="hako-quote-author">${escapeHtml(username)}</span>`;
  const jump = postId
    ? `<a href="#post-${postId}" class="hako-quote-jump">↑</a>`
    : "";

  const innerHtml = parseMarkdown(innerContent, avatars, depth + 1);

  return `<div class="hako-quote"><div class="hako-quote-header">${avatar}${name}${jump}</div><div class="hako-quote-body">${innerHtml}</div></div>`;
}

/**
 * Renders Markdown text to HTML using the Rust WASM engine,
 * with custom [quote] BBCode support for forum quoting.
 */
export function parseMarkdown(
  text: string,
  avatars: Record<string, string> = {},
  depth = 0,
): string {
  if (depth > 5) return escapeHtml(text);

  if (!text.includes("[quote=")) {
    return parse_markdown_wasm(text);
  }

  const result: string[] = [];
  let i = 0;

  while (i < text.length) {
    const quoteStart = text.indexOf("[quote=", i);
    if (quoteStart === -1) {
      result.push(parse_markdown_wasm(text.slice(i)));
      break;
    }

    if (quoteStart > i) {
      result.push(parse_markdown_wasm(text.slice(i, quoteStart)));
    }

    const closeBracket = text.indexOf("]", quoteStart);
    if (closeBracket === -1) {
      result.push(parse_markdown_wasm(text.slice(quoteStart)));
      break;
    }

    const attrStr = text.slice(quoteStart + 7, closeBracket);
    const contentStart = closeBracket + 1;

    let tagDepth = 1;
    let searchPos = contentStart;

    while (tagDepth > 0 && searchPos < text.length) {
      const nextOpen = text.indexOf("[quote", searchPos);
      const nextClose = text.indexOf("[/quote]", searchPos);

      if (nextClose === -1) {
        tagDepth = 0;
        searchPos = text.length;
        break;
      }

      if (nextOpen !== -1 && nextOpen < nextClose) {
        tagDepth++;
        searchPos = nextOpen + 6;
      } else {
        tagDepth--;
        searchPos = nextClose + 8;
      }
    }

    const innerContent = text.slice(contentStart, searchPos - 8);
    const quoteHtml = buildQuoteHtml(attrStr, innerContent, avatars, depth);
    result.push(quoteHtml);

    i = searchPos;
  }

  return result.join("\n");
}

/**
 * Calculates the character count of visible text, ignoring Markdown syntax.
 */
export function getVisibleCharacterCount(text: string): number {
  return text
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/(\*\*\*|\*\*|\*)/g, "")
    .trim()
    .length;
}
