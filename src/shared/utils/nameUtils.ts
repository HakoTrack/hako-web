export function formatName(first: string | null, last: string | null, order: string | null = 'family_given', middle: string | null = null): string {
  if (!first && !last && !middle) return '';
  const given = middle ? `${first ?? ''} ${middle}` : (first ?? '');
  if (!first && !last) return middle ?? '';
  if (!first) return last ?? '';
  if (!last) return middle ? `${first} ${middle}` : first;
  if (order === 'given_family') return `${given} ${last}`;
  return `${last} ${given}`;
}
