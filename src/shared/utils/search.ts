export interface SearchOperators {
  [key: string]: string;
}

export interface ParsedQuery {
  operators: SearchOperators;
  freeQuery: string;
}

/**
 * Parses a search query string into operators (key:value) and a free-text search term.
 * Example: "one piece genre:adventure score:8"
 * -> { operators: { genre: "adventure", score: "8" }, freeQuery: "one piece" }
 */
export function parseQuery(query: string): ParsedQuery {
  const parts = query.split(' ');
  const operators: SearchOperators = {};
  const freeQueryParts: string[] = [];

  for (const part of parts) {
    if (part.includes(':')) {
      const [key, value] = part.split(':');
      if (key && value) {
        operators[key.toLowerCase()] = value.toLowerCase();
      } else {
        freeQueryParts.push(part);
      }
    } else {
      freeQueryParts.push(part);
    }
  }

  return {
    operators,
    freeQuery: freeQueryParts.join(' ').trim(),
  };
}
