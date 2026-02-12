import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/workspaces/[id]/runs/[runId]
 * Return run status, progress array, and result (if completed).
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string; runId: string } }
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

    // Fetch the run
    const { data: run, error: runError } = await supabase
      .from('workflow_runs')
      .select('*')
      .eq('id', params.runId)
      .eq('workspace_id', params.id)
      .single();

    if (runError || !run) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      run: {
        id: run.id,
        status: run.status,
        progress: run.progress,
        result: run.result,
        error: run.error,
        credits_used: run.credits_used,
        started_at: run.started_at,
        completed_at: run.completed_at,
        created_at: run.created_at,
      },
    });
  } catch (error) {
    console.error('[GET /api/workspaces/[id]/runs/[runId]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
