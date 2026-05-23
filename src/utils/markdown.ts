export type MarkdownPart =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'bold-italic'; content: string }
  | { type: 'link'; content: string; url: string }
  | { type: 'image'; alt: string; url: string };

export function parseMarkdown(text: string): MarkdownPart[] {
  const parts: MarkdownPart[] = [];
  const regex: RegExp = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }

    // Mapping match indices to part generators
    const handlers: Record<string, () => MarkdownPart> = {
      "1": () => ({ type: 'image', alt: match![1] || 'Image', url: match![2] }),
      "3": () => ({ type: 'link', content: match![3], url: match![4] }),
      "5": () => ({ type: 'bold-italic', content: match![5] }),
      "6": () => ({ type: 'bold', content: match![6] }),
      "7": () => ({ type: 'italic', content: match![7] }),
    };

    // Find which group matched
    for (const index in handlers) {
      if (match[parseInt(index)] !== undefined) {
        parts.push(handlers[index]());
        break;
      }
    }

    lastIndex = regex.lastIndex;
  }


  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return parts;
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
