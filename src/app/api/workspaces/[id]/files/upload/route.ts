import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import { parseFile, chunkText, generateEmbeddings } from '@/lib/rag';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'text/plain',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * POST /api/workspaces/[id]/files/upload
 * Accept multipart form data with a file.
 * Validates MIME type and size, uploads to Supabase Storage,
 * creates a DB record, and runs the RAG pipeline inline.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify workspace ownership
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', params.id)
      .single();

    if (wsError || !workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    if (workspace.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: `Unsupported file type "${file.type}". Allowed types: PDF, DOCX, CSV, TXT.`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 50MB.` },
        { status: 400 }
      );
    }

    const fileId = uuidv4();
    const originalName = file.name;
    const storagePath = `${params.id}/${fileId}/${originalName}`;

    // Read file into a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('business-files')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[File Upload] Storage upload failed:', uploadError.message);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Create file record in DB with processing_status: 'pending'
    const { data: fileRecord, error: insertError } = await supabase
      .from('files')
      .insert({
        id: fileId,
        workspace_id: params.id,
        name: originalName,
        original_name: originalName,
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: storagePath,
        tags: [],
        metadata: {},
        processing_status: 'pending',
      })
      .select('*')
      .single();

    if (insertError || !fileRecord) {
      console.error('[File Upload] DB insert failed:', insertError?.message);
      // Clean up the uploaded file from storage
      await supabase.storage.from('business-files').remove([storagePath]);
      return NextResponse.json(
        { error: 'Failed to create file record' },
        { status: 500 }
      );
    }

    // --- RAG processing (inline for MVP) ---
    try {
      // Update status to 'processing'
      await supabase
        .from('files')
        .update({ processing_status: 'processing' })
        .eq('id', fileId);

      // Step 1: Parse file text
      const text = await parseFile(buffer, file.type, originalName);

      // Step 2: Chunk the text
      const chunks = chunkText(text);

      // Step 3: Generate embeddings (skip if Voyage API key not set)
      let embeddings: number[][] | null = null;
      const hasVoyageKey = !!process.env.VOYAGE_API_KEY;

      if (hasVoyageKey && chunks.length > 0) {
        try {
          embeddings = await generateEmbeddings(chunks.map((c) => c.content));
        } catch (embeddingError) {
          console.warn(
            '[File Upload] Embedding generation failed, storing chunks without embeddings:',
            embeddingError
          );
          embeddings = null;
        }
      }

      // Step 4: Store chunks in DB
      const chunkRecords = chunks.map((chunk, index) => ({
        id: uuidv4(),
        file_id: fileId,
        workspace_id: params.id,
        chunk_index: chunk.index,
        content: chunk.content,
        token_count: chunk.tokenCount,
        embedding: embeddings ? embeddings[index] : null,
        metadata: {
          file_name: originalName,
        },
      }));

      if (chunkRecords.length > 0) {
        // Insert in batches of 100 to avoid request size limits
        const BATCH_SIZE = 100;
        for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
          const batch = chunkRecords.slice(i, i + BATCH_SIZE);
          const { error: chunkInsertError } = await supabase
            .from('file_chunks')
            .insert(batch);

          if (chunkInsertError) {
            throw new Error(
              `Failed to insert chunk batch ${i / BATCH_SIZE + 1}: ${chunkInsertError.message}`
            );
          }
        }
      }

      // Update processing_status to 'ready'
      await supabase
        .from('files')
        .update({ processing_status: 'ready' })
        .eq('id', fileId);

      // Re-fetch the updated record
      const { data: updatedFile } = await supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
        .single();

      return NextResponse.json(
        { file: updatedFile || { ...fileRecord, processing_status: 'ready' } },
        { status: 201 }
      );
    } catch (ragError) {
      console.error('[File Upload] RAG processing failed:', ragError);

      // Update processing_status to 'error'
      await supabase
        .from('files')
        .update({
          processing_status: 'error',
          metadata: {
            ...fileRecord.metadata,
            processing_error:
              ragError instanceof Error ? ragError.message : String(ragError),
          },
        })
        .eq('id', fileId);

      // Re-fetch the updated record
      const { data: errorFile } = await supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
        .single();

      return NextResponse.json(
        { file: errorFile || { ...fileRecord, processing_status: 'error' } },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('[POST /api/workspaces/[id]/files/upload] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
