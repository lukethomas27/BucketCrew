import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/workspaces
 * Return all workspaces for the authenticated user.
 */
export async function GET() {
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

    const { data: workspaces, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch workspaces' },
        { status: 500 }
      );
    }

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error('[GET /api/workspaces] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces
 * Create a new workspace and a free subscription for it.
 * Body: { name: string }
 */
export async function POST(request: Request) {
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

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400 }
      );
    }

    // Create workspace
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({
        name: name.trim(),
        owner_id: user.id,
      })
      .select('*')
      .single();

    if (wsError || !workspace) {
      return NextResponse.json(
        { error: 'Failed to create workspace' },
        { status: 500 }
      );
    }

    // Create free subscription for the workspace
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert({
        workspace_id: workspace.id,
        plan: 'free',
        credits_total: 3,
        credits_used: 0,
      });

    if (subError) {
      console.error('[POST /api/workspaces] Failed to create subscription:', subError.message);
      // Workspace was created but subscription failed — log but still return workspace
    }

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/workspaces] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
