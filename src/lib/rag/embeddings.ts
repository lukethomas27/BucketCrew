// ---------------------------------------------------------------------------
// Embedding generation via Voyage AI (voyage-3, 1024-dimensional vectors).
// ---------------------------------------------------------------------------

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-3';
const VOYAGE_BATCH_SIZE = 128; // Voyage AI hard limit per request

interface VoyageEmbeddingResponse {
  data: { embedding: number[]; index: number }[];
  usage: { total_tokens: number };
}

/**
 * Call the Voyage AI embeddings endpoint for a single batch of texts.
 */
async function callVoyageApi(
  texts: string[],
  inputType: 'document' | 'query'
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'VOYAGE_API_KEY environment variable is not set. ' +
        'Please add it to your .env.local file.'
    );
  }

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: texts,
      input_type: inputType,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Voyage AI API error (${response.status}): ${body}`
    );
  }

  const json: VoyageEmbeddingResponse = await response.json();

  // The API may return embeddings out of order – sort by index.
  const sorted = json.data.sort((a, b) => a.index - b.index);
  return sorted.map((d) => d.embedding);
}

/**
 * Generate embeddings for an array of document texts.
 *
 * Texts are batched in groups of 128 (Voyage AI limit) and results are
 * concatenated in order.
 *
 * @returns An array of 1024-dimensional embedding vectors, one per input text.
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += VOYAGE_BATCH_SIZE) {
    const batch = texts.slice(i, i + VOYAGE_BATCH_SIZE);
    const embeddings = await callVoyageApi(batch, 'document');
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

/**
 * Generate a single query embedding (uses `input_type: "query"` for
 * asymmetric retrieval).
 *
 * @returns A single 1024-dimensional embedding vector.
 */
export async function generateQueryEmbedding(
  query: string
): Promise<number[]> {
  const [embedding] = await callVoyageApi([query], 'query');
  return embedding;
}
