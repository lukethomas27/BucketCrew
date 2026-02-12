// ---------------------------------------------------------------------------
// Text chunker – splits extracted text into overlapping chunks sized by
// an approximate token budget.
// ---------------------------------------------------------------------------

export interface ChunkOptions {
  /** Maximum tokens per chunk (default 500). */
  maxTokens?: number;
  /** Tokens of overlap between consecutive chunks (default 50). */
  overlapTokens?: number;
}

export interface TextChunk {
  /** The chunk text. */
  content: string;
  /** Zero-based index of this chunk within the document. */
  index: number;
  /** Estimated token count for this chunk. */
  tokenCount: number;
}

/**
 * Rough token estimation – ~4 characters per token on average.
 * Good enough for an MVP; swap in a real tokeniser later if needed.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Return the trailing portion of `text` that is approximately
 * `overlapTokens` tokens long, splitting at the nearest whitespace
 * boundary so we never cut a word in half.
 */
function getOverlapText(text: string, overlapTokens: number): string {
  if (overlapTokens <= 0) return '';

  const charBudget = overlapTokens * 4;
  if (text.length <= charBudget) return text;

  // Walk backwards from the cut-point to find a whitespace boundary.
  let start = text.length - charBudget;
  while (start < text.length && text[start] !== ' ' && text[start] !== '\n') {
    start++;
  }
  // Skip the whitespace character itself.
  if (start < text.length) start++;

  return text.slice(start);
}

/**
 * Split a long paragraph into sentence-level pieces.  We look for
 * sentence-ending punctuation followed by whitespace.
 */
function splitBySentences(text: string): string[] {
  // Split after `.` / `!` / `?` followed by one or more whitespace chars.
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.filter((p) => p.length > 0);
}

/**
 * Chunk a document's text into a list of `TextChunk` objects.
 *
 * Strategy (coarse to fine):
 *   1. Split by double newlines (paragraphs).
 *   2. If a paragraph exceeds `maxTokens`, split by single newlines.
 *   3. If a line still exceeds `maxTokens`, split by sentences.
 *
 * Small consecutive segments are merged together until the chunk would
 * exceed `maxTokens`.  When starting a new chunk the last `overlapTokens`
 * worth of text from the previous chunk is prepended for context.
 */
export function chunkText(text: string, options?: ChunkOptions): TextChunk[] {
  const maxTokens = options?.maxTokens ?? 500;
  const overlapTokens = options?.overlapTokens ?? 50;

  // ---- Step 1: break into atomic segments ----
  const segments = breakIntoSegments(text, maxTokens);

  // ---- Step 2: pack segments into chunks with overlap ----
  const chunks: TextChunk[] = [];
  let currentParts: string[] = [];
  let currentTokens = 0;
  let overlapPrefix = '';

  function flushChunk() {
    if (currentParts.length === 0) return;
    const content = currentParts.join('\n\n');
    chunks.push({
      content,
      index: chunks.length,
      tokenCount: estimateTokens(content),
    });
    overlapPrefix = getOverlapText(content, overlapTokens);
    currentParts = [];
    currentTokens = 0;
  }

  for (const segment of segments) {
    const segTokens = estimateTokens(segment);

    // If the segment alone exceeds maxTokens it must form its own chunk.
    if (segTokens > maxTokens) {
      flushChunk();

      // Prepend overlap from previous chunk if available.
      const withOverlap = overlapPrefix
        ? overlapPrefix + '\n\n' + segment
        : segment;

      chunks.push({
        content: withOverlap,
        index: chunks.length,
        tokenCount: estimateTokens(withOverlap),
      });
      overlapPrefix = getOverlapText(segment, overlapTokens);
      continue;
    }

    // Would adding this segment exceed the budget?
    const joinCost = currentParts.length > 0 ? estimateTokens('\n\n') : 0;
    if (currentTokens + joinCost + segTokens > maxTokens && currentParts.length > 0) {
      flushChunk();
    }

    // When starting a fresh chunk, prepend overlap text.
    if (currentParts.length === 0 && overlapPrefix) {
      currentParts.push(overlapPrefix);
      currentTokens = estimateTokens(overlapPrefix + '\n\n');
    }

    currentParts.push(segment);
    currentTokens += segTokens + (currentParts.length > 1 ? estimateTokens('\n\n') : 0);
  }

  flushChunk();

  return chunks;
}

// ---------------------------------------------------------------------------
// Helpers – progressively split text into segments that are each <=maxTokens
// ---------------------------------------------------------------------------

function breakIntoSegments(text: string, maxTokens: number): string[] {
  // 1) Split by double newlines (paragraph boundaries).
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  const segments: string[] = [];

  for (const para of paragraphs) {
    if (estimateTokens(para) <= maxTokens) {
      segments.push(para.trim());
      continue;
    }

    // 2) Paragraph too long – split by single newlines.
    const lines = para.split(/\n/).filter((l) => l.trim().length > 0);
    for (const line of lines) {
      if (estimateTokens(line) <= maxTokens) {
        segments.push(line.trim());
        continue;
      }

      // 3) Line still too long – split by sentences.
      const sentences = splitBySentences(line);
      for (const sentence of sentences) {
        segments.push(sentence.trim());
      }
    }
  }

  return segments;
}
