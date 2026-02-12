import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/workspaces/[id]
 * Return a single workspace by ID. Verifies the authenticated user owns it.
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

    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !workspace) {
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

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error('[GET /api/workspaces/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workspaces/[id]
 * Update a workspace's name and/or settings.
 * Body: { name?: string, settings?: WorkspaceSettings }
 */
export async function PATCH(
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
    const { data: existing, error: fetchError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    if (existing.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Invalid workspace name' },
          { status: 400 }
        );
      }
      updates.name = body.name.trim();
    }

    if (body.settings !== undefined) {
      if (typeof body.settings !== 'object' || body.settings === null) {
        return NextResponse.json(
          { error: 'Invalid settings object' },
          { status: 400 }
        );
      }
      updates.settings = body.settings;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data: workspace, error: updateError } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', params.id)
      .select('*')
      .single();

    if (updateError || !workspace) {
      return NextResponse.json(
        { error: 'Failed to update workspace' },
        { status: 500 }
      );
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error('[PATCH /api/workspaces/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspaces/[id]
 * Delete a workspace. Verifies the authenticated user owns it.
 */
export async function DELETE(
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
    const { data: existing, error: fetchError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    if (existing.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete workspace' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/workspaces/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
