import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ChecklistItem } from '@/types';

/**
 * GET /api/workspaces/[id]/deliverables/[deliverableId]
 * Return a single deliverable.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string; deliverableId: string } }
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

    const { data: deliverable, error } = await supabase
      .from('deliverables')
      .select('*')
      .eq('id', params.deliverableId)
      .eq('workspace_id', params.id)
      .single();

    if (error || !deliverable) {
      return NextResponse.json(
        { error: 'Deliverable not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ deliverable });
  } catch (error) {
    console.error(
      '[GET /api/workspaces/[id]/deliverables/[deliverableId]] Unexpected error:',
      error
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workspaces/[id]/deliverables/[deliverableId]
 * Update the checklist state of a deliverable.
 * Body: { checklist: ChecklistItem[] }
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; deliverableId: string } }
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
    const { checklist } = body;

    if (!Array.isArray(checklist)) {
      return NextResponse.json(
        { error: 'checklist must be an array' },
        { status: 400 }
      );
    }

    // Validate checklist item shape
    const isValid = checklist.every(
      (item: unknown): item is ChecklistItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as ChecklistItem).id === 'string' &&
        typeof (item as ChecklistItem).text === 'string' &&
        typeof (item as ChecklistItem).completed === 'boolean'
    );

    if (!isValid) {
      return NextResponse.json(
        {
          error:
            'Each checklist item must have id (string), text (string), and completed (boolean)',
        },
        { status: 400 }
      );
    }

    // Verify deliverable exists and belongs to this workspace
    const { data: existing, error: fetchError } = await supabase
      .from('deliverables')
      .select('id')
      .eq('id', params.deliverableId)
      .eq('workspace_id', params.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Deliverable not found' },
        { status: 404 }
      );
    }

    // Update checklist
    const { data: deliverable, error: updateError } = await supabase
      .from('deliverables')
      .update({ checklist })
      .eq('id', params.deliverableId)
      .select('*')
      .single();

    if (updateError || !deliverable) {
      return NextResponse.json(
        { error: 'Failed to update deliverable checklist' },
        { status: 500 }
      );
    }

    return NextResponse.json({ deliverable });
  } catch (error) {
    console.error(
      '[PATCH /api/workspaces/[id]/deliverables/[deliverableId]] Unexpected error:',
      error
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
