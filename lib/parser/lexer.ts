import type { LexedPnr, PnrToken, SourceLine, SourceSpan, TokenKind } from "@/types/pnr";

// Words include Unicode letters/marks so a non-ASCII name is preserved for
// review, even though client-facing quote fields must be English. Do not
// normalize case or collapse whitespace: both can carry GDS information.
const tokenPattern = /[\p{L}\p{M}]+|[0-9]+|[^\s\p{L}\p{M}0-9]/gu;
const lineBreakPattern = /\r\n|\r|\n/g;

function lineAt(raw: string, number: number, startOffset: number, endOffset: number, newline: SourceLine["newline"]): SourceLine {
  const text = raw.slice(startOffset, endOffset);
  const tokens: PnrToken[] = [];
  for (const match of text.matchAll(tokenPattern)) {
    const start = startOffset + match.index;
    const end = start + match[0].length;
    const value = match[0];
    const kind: TokenKind = /^[0-9]+$/.test(value) ? "number" : /^[\p{L}\p{M}]+$/u.test(value) ? "word" : "symbol";
    const span: SourceSpan = { startLine: number, endLine: number, startColumn: match.index + 1, endColumn: match.index + value.length + 1, startOffset: start, endOffset: end };
    tokens.push({ kind, value, span });
  }
  return { number, raw: text, newline, span: { startLine: number, endLine: number, startColumn: 1, endColumn: text.length + 1, startOffset, endOffset }, tokens };
}

/** Physical lines are kept, including an empty final line after a trailing newline. */
export function lexPnr(raw: string): LexedPnr {
  const lines: SourceLine[] = [];
  let start = 0;
  for (const match of raw.matchAll(lineBreakPattern)) {
    lines.push(lineAt(raw, lines.length + 1, start, match.index, match[0] as SourceLine["newline"]));
    start = match.index + match[0].length;
  }
  lines.push(lineAt(raw, lines.length + 1, start, raw.length, ""));
  return { lines, tokens: lines.flatMap(line => line.tokens), rawLength: raw.length };
}
