import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/workspaces/[id]/usage
 * Return credit usage for a workspace: subscription info + usage records.
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

    // Fetch subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('workspace_id', params.id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No subscription found for this workspace' },
        { status: 404 }
      );
    }

    // Fetch usage records
    const { data: usageRecords, error: usageError } = await supabase
      .from('credit_usage')
      .select('*')
      .eq('workspace_id', params.id)
      .order('created_at', { ascending: false });

    if (usageError) {
      return NextResponse.json(
        { error: 'Failed to fetch usage records' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        credits_total: subscription.credits_total,
        credits_used: subscription.credits_used,
        credits_available: subscription.credits_total - subscription.credits_used,
        period_start: subscription.period_start,
        period_end: subscription.period_end,
      },
      usage: usageRecords || [],
    });
  } catch (error) {
    console.error('[GET /api/workspaces/[id]/usage] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
