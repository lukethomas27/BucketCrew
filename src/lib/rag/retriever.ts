// ---------------------------------------------------------------------------
// Vector similarity search via Supabase RPC.
//
// Requires the following function to exist in your Supabase database.
// Run this in the Supabase SQL editor:
//
// create or replace function match_chunks(
//   query_embedding vector(1024),
//   match_workspace_id uuid,
//   match_file_ids uuid[] default null,
//   match_count int default 20,
//   match_threshold float default 0.3
// ) returns table (
//   id uuid, file_id uuid, workspace_id uuid, chunk_index int,
//   content text, token_count int, metadata jsonb, similarity float
// ) language plpgsql as $$
// begin
//   return query
//   select fc.id, fc.file_id, fc.workspace_id, fc.chunk_index,
//     fc.content, fc.token_count, fc.metadata,
//     1 - (fc.embedding <=> query_embedding) as similarity
//   from file_chunks fc
//   where fc.workspace_id = match_workspace_id
//     and (match_file_ids is null or fc.file_id = any(match_file_ids))
//     and 1 - (fc.embedding <=> query_embedding) > match_threshold
//   order by fc.embedding <=> query_embedding
//   limit match_count;
// end;
// $$;
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server';
import { generateQueryEmbedding } from './embeddings';
import type { RetrievedChunk } from '@/types';

export interface RetrieveParams {
  /** Workspace to scope the search to. */
  workspaceId: string;
  /** Natural-language query used for similarity matching. */
  query: string;
  /** Optional list of file IDs to restrict the search to. */
  fileIds?: string[];
  /** Maximum number of chunks to return (default 20). */
  topK?: number;
}

/**
 * Retrieve the most relevant chunks for a given query within a workspace.
 *
 * 1. Generates a query embedding via Voyage AI.
 * 2. Calls the Supabase `match_chunks` RPC that performs cosine similarity
 *    search on the `file_chunks` table.
 * 3. Returns matched chunks ordered by descending similarity.
 */
export async function retrieveChunks(
  params: RetrieveParams
): Promise<RetrievedChunk[]> {
  const { workspaceId, query, fileIds, topK } = params;

  // 1. Generate the query embedding (asymmetric, input_type = "query").
  const embedding = await generateQueryEmbedding(query);

  // 2. Call the Supabase vector search function.
  const supabase = createClient();

  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: embedding,
    match_workspace_id: workspaceId,
    match_file_ids: fileIds || null,
    match_count: topK || 20,
    match_threshold: 0.3,
  });

  if (error) {
    throw new Error(
      `Vector search failed: ${error.message} (code: ${error.code})`
    );
  }

  if (!data || data.length === 0) {
    return [];
  }

  // 3. Map raw rows to the RetrievedChunk type.
  const chunks: RetrievedChunk[] = data.map(
    (row: {
      id: string;
      file_id: string;
      workspace_id: string;
      chunk_index: number;
      content: string;
      token_count: number;
      metadata: { page?: number; section?: string; file_name?: string };
      similarity: number;
    }) => ({
      id: row.id,
      file_id: row.file_id,
      workspace_id: row.workspace_id,
      chunk_index: row.chunk_index,
      content: row.content,
      token_count: row.token_count,
      metadata: row.metadata,
      similarity: row.similarity,
      file_name: row.metadata?.file_name ?? '',
    })
  );

  return chunks;
}
