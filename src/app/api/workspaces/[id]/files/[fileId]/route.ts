import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PATCH /api/workspaces/[id]/files/[fileId]
 * Update file tags.
 * Body: { tags: string[] }
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; fileId: string } }
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

    // Parse body
    const body = await request.json();
    const { tags } = body;

    if (!Array.isArray(tags) || !tags.every((t: unknown) => typeof t === 'string')) {
      return NextResponse.json(
        { error: 'Tags must be an array of strings' },
        { status: 400 }
      );
    }

    // Verify the file belongs to this workspace
    const { data: existingFile, error: fileError } = await supabase
      .from('files')
      .select('id, workspace_id')
      .eq('id', params.fileId)
      .eq('workspace_id', params.id)
      .single();

    if (fileError || !existingFile) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Update tags
    const { data: updatedFile, error: updateError } = await supabase
      .from('files')
      .update({ tags })
      .eq('id', params.fileId)
      .select('*')
      .single();

    if (updateError || !updatedFile) {
      return NextResponse.json(
        { error: 'Failed to update file tags' },
        { status: 500 }
      );
    }

    return NextResponse.json({ file: updatedFile });
  } catch (error) {
    console.error('[PATCH /api/workspaces/[id]/files/[fileId]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspaces/[id]/files/[fileId]
 * Delete a file, its storage object, and all associated chunks.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; fileId: string } }
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

    // Fetch the file record to get the storage path
    const { data: fileRecord, error: fileError } = await supabase
      .from('files')
      .select('id, storage_path, workspace_id')
      .eq('id', params.fileId)
      .eq('workspace_id', params.id)
      .single();

    if (fileError || !fileRecord) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Delete associated chunks
    const { error: chunksDeleteError } = await supabase
      .from('file_chunks')
      .delete()
      .eq('file_id', params.fileId);

    if (chunksDeleteError) {
      console.error('[File Delete] Failed to delete chunks:', chunksDeleteError.message);
    }

    // Delete from storage
    const { error: storageDeleteError } = await supabase.storage
      .from('business-files')
      .remove([fileRecord.storage_path]);

    if (storageDeleteError) {
      console.error('[File Delete] Failed to delete storage object:', storageDeleteError.message);
    }

    // Delete the file record from DB
    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('id', params.fileId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete file record' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/workspaces/[id]/files/[fileId]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
