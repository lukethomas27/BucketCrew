import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import { executeWorkflow } from '@/lib/orchestrator';

/**
 * POST /api/workspaces/[id]/runs
 * Start a new workflow run.
 * Body: { template_id: string, input: Record<string, unknown>, file_ids: string[] }
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

    // Parse body
    const body = await request.json();
    const { template_id, input, file_ids } = body;

    if (!template_id || typeof template_id !== 'string') {
      return NextResponse.json(
        { error: 'template_id is required' },
        { status: 400 }
      );
    }

    if (!input || typeof input !== 'object') {
      return NextResponse.json(
        { error: 'input is required and must be an object' },
        { status: 400 }
      );
    }

    if (!Array.isArray(file_ids)) {
      return NextResponse.json(
        { error: 'file_ids must be an array' },
        { status: 400 }
      );
    }

    // Check subscription and available credits
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('workspace_id', params.id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No subscription found for this workspace' },
        { status: 400 }
      );
    }

    const creditsAvailable = subscription.credits_total - subscription.credits_used;

    if (creditsAvailable < 1) {
      return NextResponse.json(
        {
          error: 'Insufficient credits. Please upgrade your plan.',
          credits_available: creditsAvailable,
        },
        { status: 400 }
      );
    }

    // Create workflow_run record with status 'pending'
    const runId = uuidv4();

    const { error: runInsertError } = await supabase
      .from('workflow_runs')
      .insert({
        id: runId,
        workspace_id: params.id,
        user_id: user.id,
        template_id,
        input,
        file_ids,
        status: 'pending',
        progress: [],
        result: null,
        error: null,
        credits_used: 1,
        started_at: null,
        completed_at: null,
      });

    if (runInsertError) {
      console.error('[Start Run] Failed to create run record:', runInsertError.message);
      return NextResponse.json(
        { error: 'Failed to create workflow run' },
        { status: 500 }
      );
    }

    // Deduct 1 credit from subscription
    const { error: creditUpdateError } = await supabase
      .from('subscriptions')
      .update({ credits_used: subscription.credits_used + 1 })
      .eq('id', subscription.id);

    if (creditUpdateError) {
      console.error('[Start Run] Failed to deduct credit:', creditUpdateError.message);
    }

    // Log credit usage
    const { error: usageLogError } = await supabase
      .from('credit_usage')
      .insert({
        id: uuidv4(),
        workspace_id: params.id,
        user_id: user.id,
        run_id: runId,
        credits: 1,
        model: 'claude-sonnet-4-20250514',
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost_usd: 0,
      });

    if (usageLogError) {
      console.error('[Start Run] Failed to log credit usage:', usageLogError.message);
    }

    // Fire-and-forget: start workflow execution in background
    executeWorkflow({
      runId,
      workspaceId: params.id,
      templateId: template_id,
      userInput: input,
      fileIds: file_ids,
    }).catch((err) => {
      console.error(`[Workflow Run ${runId}] Background execution failed:`, err);
    });

    return NextResponse.json({ run_id: runId }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/workspaces/[id]/runs] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
