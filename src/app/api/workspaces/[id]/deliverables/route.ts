import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/workspaces/[id]/deliverables
 * Return all deliverables for a workspace, ordered by created_at desc.
 */
export async function GET(
  _request: Request,
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

    const { data: deliverables, error } = await supabase
      .from('deliverables')
      .select('*')
      .eq('workspace_id', params.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch deliverables' },
        { status: 500 }
      );
    }

    return NextResponse.json({ deliverables });
  } catch (error) {
    console.error('[GET /api/workspaces/[id]/deliverables] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
