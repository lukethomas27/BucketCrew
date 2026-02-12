import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/workspaces/[id]/files
 * Return all files for a workspace, with optional tag filter via ?tag= query param.
 */
export async function GET(
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

    // Parse optional tag filter from query string
    const { searchParams } = new URL(request.url);
    const tagFilter = searchParams.get('tag');

    let query = supabase
      .from('bucket_files')
      .select('*')
      .eq('workspace_id', params.id)
      .order('created_at', { ascending: false });

    if (tagFilter) {
      query = query.contains('tags', [tagFilter]);
    }

    const { data: files, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch files' },
        { status: 500 }
      );
    }

    return NextResponse.json({ files });
  } catch (error) {
    console.error('[GET /api/workspaces/[id]/files] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
