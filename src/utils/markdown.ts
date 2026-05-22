export type MarkdownPart =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'link'; content: string; url: string }
  | { type: 'image'; alt: string; url: string };

export function parseMarkdown(text: string): MarkdownPart[] {
  const parts: MarkdownPart[] = [];
  // Matches: ![alt](url) OR [text](url) OR **bold** OR *italic*
  // Added optional grouping for alt text: !\[([^\]]*)\]\(([^)]+)\)
  const regex = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }

    if (match[1] !== undefined) { // Image: ![alt](url) - match[1] can be empty string
      parts.push({ type: 'image', alt: match[1] || 'Image', url: match[2] });
    } else if (match[3]) { // Link: [text](url)
      parts.push({ type: 'link', content: match[3], url: match[4] });
    } else if (match[5]) { // Bold: **text**
      parts.push({ type: 'bold', content: match[5] });
    } else if (match[6]) { // Italic: *text*
      parts.push({ type: 'italic', content: match[6] });
    }

    lastIndex = regex.lastIndex;
  }


  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return parts;
}
