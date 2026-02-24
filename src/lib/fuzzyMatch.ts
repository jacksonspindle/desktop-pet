/**
 * Simple fuzzy matching for command palette.
 * Returns a score >= 0 for matches, or -1 for no match.
 */
export function fuzzyMatch(query: string, label: string, keywords: string[]): number {
  if (!query) return 0;

  const q = query.toLowerCase();
  const l = label.toLowerCase();

  // Exact prefix match on label → highest score
  if (l.startsWith(q)) return 100;

  // Substring match in label → high score
  if (l.includes(q)) return 75;

  // Keyword exact prefix match
  for (const kw of keywords) {
    if (kw.toLowerCase().startsWith(q)) return 40;
  }

  // Keyword substring match
  for (const kw of keywords) {
    if (kw.toLowerCase().includes(q)) return 30;
  }

  // Character-by-character fuzzy on label
  let li = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const found = l.indexOf(q[qi], li);
    if (found === -1) return -1;
    li = found + 1;
  }
  return 50;
}
